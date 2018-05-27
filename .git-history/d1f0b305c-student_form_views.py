import datetime
import json
import logging

from dateutil.parser import parse as date_parse
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.core.files import File
from django.core.urlresolvers import reverse
from django.forms.forms import NON_FIELD_ERRORS
from django.forms.utils import ErrorList
from django.http import HttpResponse, Http404
from django.shortcuts import render, get_object_or_404
from django.template.loader import render_to_string
from django.utils.text import slugify
from django.views.generic import View

from admissions.constants import HEARD_ABOUT_DETAILS_LABEL_MAP, OTHER_POLICIES, \
    EMAIL_ADDRESS
from admissions.constants import WEMT_LINK
from admissions.constants_apply_generic import RELATIONSHIP_TYPE_CHOICES
from admissions.dashboard.student_form_utils import clear_status_if_reference_submitted
from admissions.models import OpenApp
from admissions.utils_apply_generic import _create_entity_relationship, relationship_is_guardian
from admissions.utils_apply_open import PKEncrypter
from core.formhelp import populate_person_data, populate_phone_data, populate_person_attrs, \
    populate_address_data
from core.models import AccountTab
from core.models import CourseStatusRecordTab, CourseTab
from core.nmc import da
from core.templatetags.formatting_tools import gender_pronoun
from nols_email.constants import TEMPLATE
from nols_email.utils import EmailMessage, send_email as send_email_util
from website.google_analytics import fire_event as fire_ga_event
from website.models import MailingListEntry
from .decorators import check_csr_allowed
from .forms import (
    ICChoiceForm, ICApplicantForm, ICAppEmploymentEducationForm,
    ICQuestionnaire, ICTripLog, ICResume, ICScholarship, ICRiverLogForm,
    ICAppUpdateForm)
from .forms import (
    UploadFileForm, NumberOfForms, ExtraCurricularForm,
    StudentQuestionnaireForm, ECGuardianForm, HiddenIntegerForm,
    InsuranceInfoForm, TravelAndLogisticsForm, GearPrepForm, GearRequestForm,
    WantAcademicCreditForm, AcademicCreditKind,
    HighSchoolCreditSelectionForm, CollegeCreditTypeForm,
    CollegeCreditSelectionForm, UofUUndergradForm, UofUGradForm,
    DirectSchoolForm, TravelAndLogisticsPassportForm, UploadPhotoForm,
    CourseDescriptionForm, AcademicProfessionalHistoryForm, AskReferenceForm,
    StudentInfoOtherForm, RelationshipTypeForm, EmailAddressForm, PersonForm,
    AddressForm, PhoneForm, ExistingAddressForm, LetterOfRecommendationForm,
    DenaliQuestionnaireForm, TravelAndLogisticsArrivalForm,
    TravelAndLogisticsDepartureForm, TuitionProtectionPlanForm,
    EmtChecklistForm
)
from .models import AdmissionsOfficer
from .models import StudentForm, StudentFormType
from .student_form_utils import _check_receipt, _files_to_pdf, _match_related_with_form, \
    _set_entity_from_formset, _check_ic_receipt, _process_academic_forms
from .utils import clear_emt_form

log = logging.getLogger(__name__)


@check_csr_allowed
def academic_credit_intermediate_pdf(request, csr_pk, student_form_pk):
    try:
        student_form = StudentForm.objects.filter(status=StudentForm.DRAFT)\
                                          .filter(uploaded_data__isnull=False)\
                                          .filter(type__slug__in=['academic_credit',
                                                                  'ic_app_questionnaire',
                                                                  'ic_app_scholarship'])\
                                          .get(pk=student_form_pk)
    except StudentForm.DoesNotExist:
        raise Http404

    response = HttpResponse(student_form.uploaded_data.file,
                            content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="transcript.pdf"'

    return response


def fill_reference(request, encrypted_student_form_pk, encrypted_email):
    """Respond to one of the letter of recommendation links which contain "encrypted" pks"""
    pk_encrypter = PKEncrypter()
    # Try to find "Letter of Recommendation" StudentForm supposedly associated with this request
    # and establish that it contains the fields we need
    try:
        ask_ref_student_form_pk = pk_encrypter.decrypt(encrypted_student_form_pk)
    except ValueError:
        raise Http404
    ask_ref_student_form = get_object_or_404(StudentForm, pk=ask_ref_student_form_pk)

    name = ask_ref_student_form.entered_data['name']
    email = ask_ref_student_form.entered_data['email']

    # Make sure the expected email address from the LOR StudentForm matches the one in the link.
    # Showing a 404 here is a lot simpler than trying to give some convoluted explanation of what
    # went wrong. A mismatch here could happen when an email address gets changed (i.e. applicant
    # got it wrong, then an AO fixed it) and the person with the previous email address clicks on
    # their link.
    decrypted_email = pk_encrypter.decrypt_string(encrypted_email)
    if email != decrypted_email:
        raise Http404

    # Find or create the reference's StudentForm
    slug = ask_ref_student_form.entered_data['lor_slug']
    lor_form = StudentForm.objects.get_or_create(
        type=StudentFormType.objects.get(slug=slug),
        application=ask_ref_student_form.application
    )[0]

    # No action needed if this is a re-visit to the link for an already completed recommendation
    if not lor_form.draft:
        return render(
            request, 'admissions/dashboard/student_form_views/completed_lor.html',
            {'title': 'Thank You!', 'body': 'We have received your recommendation.'}
        )

    # No action needed if the student is no longer on ICAP or the application window has closed
    csrs = CourseStatusRecordTab.objects.filter(
        application=lor_form.application).viewable().filter_upcoming_current()
    if len(csrs) < 1:
        raise Http404
    csr = csrs[0]

    # Pre-fill the reference's name and email if needed
    if not lor_form.entered_data.get('name', None):
        lor_form.entered_data['name'] = name
    if not lor_form.entered_data.get('email', None):
        lor_form.entered_data['email'] = email

    # Dispatch to the student_form_utils handler function for this student form type
    lor_form.csr = csrs[0]
    return instantiate_view_from_slug(slug, lor_form, csr, request)


def get_ic_dates(request, date_str):
    date = date_parse(date_str).date()
    date = date.replace(date.year - 1)
    course_code = request.GET.get('course_code', None)

    if course_code:
        dates = CourseTab.objects.filter(course_title__icontains='Instructor')\
                                 .filter(course_date__gt=date)\
                                 .filter(branch__type='Admissions')\
                                 .filter(course_code=course_code)\
                                 .values_list('course_date', flat=True)\
                                 .distinct()
        return HttpResponse(json.dumps([x.strftime('%m/%d/%Y') for x in dates]))

    else:
        return HttpResponse(json.dumps(None))


class BaseStudentFormView(View):
    csr = None
    student_form = None
    base_template_string = 'admissions/dashboard/student_form_views/'

    SAVE_STATES = ['save_for_later', 'final_submission']
    VALIDATION_STATES = ['validate_only', 'final_submission']

    def __init__(self, **kwargs):
        self.csr = kwargs['csr']
        self.student_form = kwargs['student_form']

    def form_template(self):
        template = self.base_template_string + \
            '{slug}_form.html'.format(slug=self.student_form.type.slug)
        return template

    def template(self):
        return self.base_template_string + '{slug}.html'.format(slug=self.student_form.type.slug)

    def get_submission_type(self, request):
        if 'submission_type' in request.POST:
            submission_type = request.POST['submission_type']
        else:
            submission_type = 'validate_only'
        return submission_type

    def get_fragment_context(self, forms, form_errors, request):
        fragment_context = {'forms': forms,
                            'csr': self.csr,
                            'student_form': self.student_form,
                            'form_errors': form_errors,
                            'request': request}
        return fragment_context

    def generate_modals(self, fragment_context, request):
        confirm_success_modal = render_to_string(
            'admissions/dashboard/student_form_views/confirm_success_modal.html',
            context=fragment_context,
            request=request
        )
        error_modal = render_to_string(
            'admissions/dashboard/student_form_views/error_modal.html',
            context=fragment_context,
            request=request
        )
        notif_modal = render_to_string(
            'admissions/dashboard/student_form_views/notif_modal.html',
            context=fragment_context,
            request=request
        )
        ajax_error_modal = render_to_string(
            'admissions/dashboard/student_form_views/ajax_error_modal.html',
            context=fragment_context,
            request=request
        )
        use_old_form_modal = render_to_string(
            'admissions/dashboard/student_form_views/use_old_form_modal.html',
            context=fragment_context,
            request=request
        )
        return {
            'confirm_success_modal': confirm_success_modal,
            'error_modal': error_modal,
            'notif_modal': notif_modal,
            'ajax_error_modal': ajax_error_modal,
            'use_old_form_modal': use_old_form_modal
        }

    def re_render_forms(self, fragment_context, request):
        return render_to_string(
            self.form_template(),
            context=fragment_context,
            request=request)

    def record_finalize_analytics(self, request):
        if not self.student_form.draft:
            name = self.student_form.type.name
            if self.csr.course.is_pro_or_lnt:
                fire_ga_event(request, 'Pro Open Application',
                              'Pro Finalize Form', name)
            else:
                fire_ga_event(request, 'Open Application',
                              'Finalize Form', name)

    def record_view_analytics(self, request):
        name = self.student_form.type.name
        if self.csr.course.is_pro_or_lnt:
            fire_ga_event(request, 'Pro Open Application',
                          'Pro View Form', name)
        else:
            fire_ga_event(request, 'Open Application', 'View Form', name)

######################################################################
# Upload Forms
######################################################################


class BaseUploadFormView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(BaseUploadFormView, self).__init__(**kwargs)
        self.form_class = UploadFileForm
        self.cleared = False
        self.ignore_mail = False
        self.recipient_list = None

    def get(self, request):
        self.record_view_analytics(request)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': [self.form_class()],
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        log.debug(request.POST)
        log.debug(request.FILES)
        submission_type = self.get_submission_type(request)

        form = self.form_class(request.POST, request.FILES)
        all_valid = form.is_valid()
        log.debug(all_valid)

        out_pdf, error = self.processor()(request.FILES)

        if error:
            form._errors['file'] = ErrorList([error])
            all_valid = False

        if all_valid:
            if submission_type == 'final_submission':
                self.student_form.store_uploaded_data(File(out_pdf))

                self.student_form.created = datetime.datetime.now()
                self.student_form.status = StudentForm.IN_REVIEW
                self.student_form.save()

                # check it off the list
                _check_receipt(self.csr,
                               self.student_form,
                               cleared=self.cleared,
                               ignore_mail=self.ignore_mail,
                               recipient_list=self.recipient_list)

        if out_pdf:
            out_pdf.close()

        fragment_context = self.get_fragment_context([form],
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'errors': form.errors,
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def processor(self):
        return _files_to_pdf


class HealthFormView(BaseUploadFormView):
    def get(self, request):
        self.record_view_analytics(request)
        # This is intended to prevent health forms from
        # being submitted more than a year in advance.

        its_too_early = False
        form_type = self.student_form.type
        if form_type.invalid_upon_expiration:
            exp_days = form_type.expiration_days
            start_date = self.csr.course.course_date
            today = datetime.date.today()
            its_too_early = (start_date - today).days >= exp_days

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'its_too_early': its_too_early,
                       'forms': [self.form_class()],
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})


class TranscriptView(BaseUploadFormView):
    pass


class StatementOfGoodStandingView(BaseUploadFormView):
    pass


class StudentAgreementView(BaseUploadFormView):
    pass


class IcAppCprView(BaseUploadFormView):
    def __init__(self, **kwargs):
        super(IcAppCprView, self).__init__(**kwargs)
        self.recipient_list = [EMAIL_ADDRESS.IC_ADMISSIONS]


class IcAppMedicalView(BaseUploadFormView):
    def __init__(self, **kwargs):
        super(IcAppMedicalView, self).__init__(**kwargs)
        self.recipient_list = [EMAIL_ADDRESS.IC_ADMISSIONS]


class PhotoView(BaseUploadFormView):
    def __init__(self, **kwargs):
        super(PhotoView, self).__init__(**kwargs)
        self.form_class = UploadPhotoForm
        self.cleared = True
        self.ignore_mail = True

    def processor(self):
        return lambda x: (x.get('file'), None)


######################################################################
# Information Awareness Forms
######################################################################


class InformationAwarenessView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(InformationAwarenessView, self).__init__(**kwargs)

    def get(self, request):
        self.record_view_analytics(request)
        _initial = {}
        if self.student_form.entered_data:
            _initial = self.student_form.entered_data
        form = self.form_class(initial=_initial)

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': [form],
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        final_submission = submission_type == 'final_submission'

        form = self.form_class(request.POST, required=final_submission)
        all_valid = form.is_valid()
        if all_valid and final_submission:
            self.student_form.status = StudentForm.IN_REVIEW
            self.student_form.entered_data = form.cleaned_data
            self.student_form.save(store_pdf=True)
            _check_receipt(self.csr, self.student_form,
                           cleared=True, ignore_mail=True)

        fragment_context = self.get_fragment_context([form],
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class CourseDescriptionView(InformationAwarenessView):
    def __init__(self, **kwargs):
        super(CourseDescriptionView, self).__init__(**kwargs)
        self.form_class = CourseDescriptionForm


class GearRequestView(InformationAwarenessView):
    def __init__(self, **kwargs):
        super(GearRequestView, self).__init__(**kwargs)
        self.form_class = GearRequestForm


class GearPrepView(InformationAwarenessView):
    def __init__(self, **kwargs):
        super(GearPrepView, self).__init__(**kwargs)
        self.form_class = GearPrepForm


class EmtChecklistView(InformationAwarenessView):
    def __init__(self, **kwargs):
        super(EmtChecklistView, self).__init__(**kwargs)
        self.form_class = EmtChecklistForm

    def get(self, request):
        self.record_view_analytics(request)
        _initial = self.student_form.entered_data if self.student_form.entered_data else {}
        form = self.form_class(initial=_initial)

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'wemt_link': WEMT_LINK,
                       'student_form': self.student_form,
                       'forms': [form],
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})


######################################################################
#
######################################################################

class AcademicCreditView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(AcademicCreditView, self).__init__(**kwargs)
        self.form_types = {
            'want_credit': WantAcademicCreditForm,
            'credit_kind': AcademicCreditKind,
            'college_credit_type': CollegeCreditTypeForm,
            'college_credit_selection': CollegeCreditSelectionForm,
            'highschool_credit_selection': HighSchoolCreditSelectionForm,
            'uofu_under': UofUUndergradForm,
            'uofu_grad': UofUGradForm,
            'uofu_upload': UploadFileForm,
            'direct_school': DirectSchoolForm,
        }

        self.forms = {}

    def get(self, request):
        self.record_view_analytics(request)
        for key in self.form_types:
            self.forms[key] = None
        self.load_saved_data(request)
        self.forms['uofu_upload'].fields['file'].required = False
        for key, form in self.forms.items():
            if key not in ['uofu_upload', 'college_credit_selection',
                           'highschool_credit_selection']:
                if form.errors:
                    form.group_errorlists = True

        self.create_proxy_pronouns(request)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': self.forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in ['final_submission']
        for key in self.form_types:
            self.forms[key] = None
        all_valid = False
        self.process_submitted_data(request, forms_required)
        if submission_type == 'final_submission':
            (all_valid,
             academic_credit_charge,
             student_form) = _process_academic_forms(self.forms,
                                                     request,
                                                     self.student_form,
                                                     submission_type == 'validate_only')

            if all_valid and submission_type in self.SAVE_STATES:
                # Save the data in entered data. Probably don't need it,
                # but good to keep it.
                for key, form in self.forms.items():
                    if key != 'uofu_upload':
                        if form.is_valid():
                            student_form.entered_data[key] = form.cleaned_data

                if academic_credit_charge:
                    self.create_academic_credit_charge(academic_credit_charge)

                student_form.status = StudentForm.IN_REVIEW
                student_form.save()
                if self.forms['want_credit'].cleaned_data['want_credit']:
                    student_form.status = StudentForm.IN_REVIEW
                    student_form.save()
                    if CollegeCreditTypeForm.U_OF_U in self.forms['college_credit_type']\
                            .cleaned_data.get('college_credit_type', ''):
                        _check_receipt(self.csr, student_form,
                                       ignore_mail=True)

                    self.send_email_to_registrar(student_form)
                else:
                    student_form.status = StudentForm.CLEARED
                    student_form.save()

        else:
            all_valid = True
            for key, form in self.forms.items():
                if key != 'uofu_upload':
                    if form.is_valid():
                        self.student_form.entered_data[key] = form.cleaned_data
                    else:
                        all_valid = False
                else:
                    if request.FILES:
                        self.store_files(request)

            self.student_form.save()

        fragment_context = self.get_fragment_context(self.forms,
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def store_files(self, request):
        out_pdf, error = _files_to_pdf(
            request.FILES,
            get_keyword=self.forms['uofu_upload'].add_prefix('file'))
        if error:
            self.forms['uofu_upload'].is_valid()
            u_errors = self.forms['uofu_upload']._errors.setdefault(
                NON_FIELD_ERRORS, ErrorList())
            u_errors.append(error)
        else:
            self.student_form.store_uploaded_data(File(out_pdf))

        if out_pdf:
            out_pdf.close()

    def send_email_to_registrar(self, student_form):
        # Send an email to the registrar
        # Not using send_mail_wrapper so I can attach forms
        subject = 'Academic Credit Request'
        recipient_list = [EMAIL_ADDRESS.REGISTRAR]
        message = render_to_string(
            ('admissions/dashboard/emails/'
             'academic_credit_registrar_email.txt'),
            {'form': student_form,
             'NEXUS_SERVER': settings.NEXUS_SERVER,
             'entity': da.entity.get_entity(
                 student_form.application.person.pk)})
        attachments = [('academic_credit_form.pdf',
                        student_form.uploaded_data.file.read(),
                        'application/pdf')]

        email = EmailMessage(subject=subject,
                             body=message,
                             to=recipient_list,
                             attachments=attachments)
        try:
            email.send(fail_silently=False)
        except:
            log.exception('Email failed to send')

    def create_academic_credit_charge(self, academic_credit_charge):
        money_to_take, full_credit = academic_credit_charge
        assert(money_to_take)

        ftr_type = 'D'
        if self.forms['credit_kind'].cleaned_data['credit_kind']\
           == 'High School Credit':
            note = 'CC-Charge ${charge} for High School Credit'.format(
                charge=money_to_take)
            policy = da.accounting.get_policy(
                OTHER_POLICIES.DASHBOARD_HIGHSCHOOL_CREDIT)
        else:
            note = 'CC-Charge ${charge} for College Credit'.format(
                charge=money_to_take)
            policy = da.accounting.get_policy(
                OTHER_POLICIES.DASHBOARD_COLLEGE_CREDIT)
        ftr = da.accounting.create_ftr(
            self.csr.application,
            self.csr.course,
            policy,
            note,
            ftr_type
        )

        if self.forms['credit_kind'].cleaned_data['credit_kind']\
           == 'High School Credit':
            reference = 'HC{0}'.format(ftr.ftr_id)
            description = AccountTab.DESCRIPTION['HC']
        else:
            reference = 'CC{0}'.format(ftr.ftr_id)
            description = AccountTab.DESCRIPTION['CC']

        da.accounting.create_generic_account_entry(
            app_id=self.csr.application.id,
            transaction_date=datetime.datetime.now(),
            description=description,
            amount=money_to_take,
            account_status=unicode(self.csr.course),
            reference=reference,
            balance=self.csr.application.account_balance()
        )

    def process_submitted_data(self, request, forms_required):
        self.forms['want_credit'] = WantAcademicCreditForm(request.POST,
                                                           required=forms_required,
                                                           prefix='want_credit')
        self.forms['credit_kind'] = AcademicCreditKind(data=request.POST,
                                                       course=self.csr.course,
                                                       required=forms_required,
                                                       prefix='credit_kind')
        self.forms['highschool_credit_selection'] = HighSchoolCreditSelectionForm(
            data=request.POST, course=self.csr.course,
            required=forms_required,
            prefix='highschool_credit_selection')
        self.forms['college_credit_type'] = CollegeCreditTypeForm(
            data=request.POST,
            required=forms_required,
            prefix='college_credit_type')

        self.forms['college_credit_selection'] = CollegeCreditSelectionForm(
            data=request.POST, course=self.csr.course,
            required=forms_required,
            prefix='college_credit_selection')
        self.forms['uofu_under'] = UofUUndergradForm(data=request.POST,
                                                     required=forms_required,
                                                     prefix='uofu_under')
        self.forms['uofu_grad'] = UofUGradForm(data=request.POST,
                                               required=forms_required,
                                               prefix='uofu_grad')

        self.forms['uofu_upload'] = UploadFileForm(data=request.POST,
                                                   files=request.FILES,
                                                   prefix='uofu_upload')

        self.forms['direct_school'] = DirectSchoolForm(data=request.POST,
                                                       files=request.FILES,
                                                       required=forms_required,
                                                       prefix='direct_school')

        self.forms['uofu_upload'].fields['file'].required = False

    def load_saved_data(self, request):
        if any([x is None for x in self.forms.values()]):
            assert(all([x is None for x in self.forms.values()]))
            for key in self.forms:
                _initial = {}
                if key in self.student_form.entered_data:
                    _initial = self.student_form.entered_data[key]
                if key in ['highschool_credit_selection',
                           'college_credit_selection',
                           'credit_kind']:
                    self.forms[key] = self.form_types[key](course=self.csr.course,
                                                           initial=_initial,
                                                           prefix=key)
                else:
                    self.forms[key] = self.form_types[key](initial=_initial,
                                                           prefix=key)

    def create_proxy_pronouns(self, request):
        if request.user.nols_person != self.csr.application.person:
            name = self.csr.application.person.name.format('N')
            pronoun = gender_pronoun(
                da.entity.get_entity(self.csr.application.person.pk), case='possessive')
            self.forms['uofu_grad'].fields['college_grad']\
                .label = u'{name} is a college graduate'\
                .format(name=name)
            self.forms['uofu_grad']\
                .fields['in_grad_school']\
                .label = u'{name} is currently enrolled in grad school'\
                .format(name=name)

            self.forms['uofu_under']\
                .fields['highschool_grad']\
                .label = u'{name} is a high school graduate (or equivalent)'\
                .format(name=name)
            self.forms['uofu_under']\
                .fields['junior_year_complete']\
                .label = u'{name} has completed {pronoun} Junior year of high school'\
                .format(name=name,
                        pronoun=pronoun)

            self.forms['credit_kind']\
                .fields['credit_kind']\
                .label = u'I would like to sign {name} up for'.format(name=name)
            self.forms['want_credit']\
                .fields['want_credit']\
                .label = u'I want {name} to receive academic credit'\
                .format(name=name)


class EmergencyContactView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(EmergencyContactView, self).__init__(**kwargs)

        self.relationship_kwargs = {'type_choices': RELATIONSHIP_TYPE_CHOICES
                                    .EMERGENCY_CONTACT,
                                    'follow_text': '',
                                    'type_label': 'Relationship to the student'}
        self.email_kwargs = {'email_address_required': True}
        self.person_kwargs = {'collapse_extra_name_fields': True,
                              'show_ethnicity': False,
                              'use_birthdate_widget': False,
                              'birth_date_required': False,
                              'show_gender': False}
        self.address_kwargs = {'type_choices': (('Home', 'Home'),
                                                ('School', 'School'),
                                                ('Work', 'Work'),
                                                ('Other', 'Other'),),
                               'show_organization': False}
        self.phone_kwargs = {'phone_required': True,
                             'type_choices': (('Home', 'Home'),
                                              ('Mobile', 'Mobile'),
                                              ('Work', 'Work'),),
                             'allow_type_update': True}

    def get(self, request):
        self.record_view_analytics(request)
        forms = []
        applicant = da.entity.get_entity(self.csr.application.person.pk)
        for i in range(2):
            forms.append({'relationship': None,
                          'email': None,
                          'person': None,
                          'existing_address': None,
                          'address': None,
                          'phone': None,
                          'guardian': None})

        econtacts = [x for x in applicant.relationships
                     if x.type == 'Emergency Contact']

        if self.student_form.entered_data:
            self.load_saved_data(econtacts, applicant, forms)
        else:
            self.load_existing_emergency_contacts(applicant, econtacts, forms)

        self.initialize_blank_forms(applicant, forms)
        self.customize_form_rendering(forms)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        forms = []
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        applicant = da.entity.get_entity(self.csr.application.person.pk)
        for i in range(2):
            forms.append({'relationship': None,
                          'email': None,
                          'person': None,
                          'existing_address': None,
                          'address': None,
                          'phone': None,
                          'guardian': None})

        econtacts = [x for x in applicant.relationships
                     if x.type == 'Emergency Contact']

        self.process_submitted_data(
            forms_required, request, econtacts, applicant, forms)
        all_valid = self.check_submission_validity(forms)

        if all_valid and submission_type in self.SAVE_STATES:
            for i, form_set in enumerate(forms):
                self.student_form.entered_data['emergency_contact_{0}'.format(i)] = {
                }
                for key, form in form_set.items():
                    if form is not None:
                        self.student_form.entered_data['emergency_contact_{0}'
                                                       .format(i)][key] = form\
                                         .cleaned_data

            if submission_type == 'final_submission':
                self.student_form.status = StudentForm.IN_REVIEW
                # See if we need to remove contacts
                matches = self.find_existing_contact_matches(
                    forms, econtacts, applicant)

                # A flag to let us know if we edited the guardian form while looping through the
                # two e-contact forms
                save_guardian = False
                for i, form_set in enumerate(forms):
                    e_entity = self.get_or_create_entity(
                        matches[i], form_set, econtacts, applicant, request)
                    _set_entity_from_formset(e_entity, applicant, form_set)
                    _create_entity_relationship(applicant, e_entity.id,
                                                'Emergency Contact')

                    # If they tell us one of their emergency contacts is also a parent/guardian
                    # then go ahead and close the deal right now.
                    if form_set['guardian'].cleaned_data['is_guardian']:
                        params = {'form_set': form_set,
                                  'applicant': applicant,
                                  'index': i,
                                  'e_entity_id': e_entity.id,
                                  'save_guardian': save_guardian}
                        save_guardian, guardian_form = self.create_and_clear_guardian_form(
                            params)

                if save_guardian:
                    _check_receipt(self.csr, guardian_form, cleared=True)

                # Clear out e contacts who are no longer e-contacts
                for i, econtact in enumerate(econtacts):
                    if i not in matches:
                        # no longer an e contact
                        da.entity.delete_relationship(econtact.id)

            self.student_form.save(store_pdf=True)
            _check_receipt(self.csr, self.student_form, cleared=True)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def create_and_clear_guardian_form(self, params):
        save_guardian = params['save_guardian']
        relationship_type = params['form_set']['relationship'].cleaned_data['relationship_type']
        # If this isn't your typical guardian relationship (i.e. parental figure)
        # then add the "Guardian" relationship
        if not relationship_is_guardian(relationship_type):
            _create_entity_relationship(
                params['applicant'], params['e_entity_id'], 'Guardian')

        student_form_type = StudentFormType.objects.get(slug='guardian_info')
        guardian_form, created = StudentForm.objects.get_or_create(application=self.csr.application,
                                                                   type=student_form_type)

        if guardian_form.status not in (StudentForm.IN_REVIEW, StudentForm.CLEARED):
            # Be aware that we are overwriting any existing draft guardian info.
            guard_key = 'guardian_info_{0}'.format(params['index'])
            guardian_form.entered_data[guard_key] = {
                'person_id': {'integer': params['e_entity_id']}
            }
            guardian_form.status = guardian_form.CLEARED
            guardian_form.save()
            save_guardian = True

        return save_guardian, guardian_form

    def get_or_create_entity(self, match, form_set, econtacts, applicant, request):
        self.record_view_analytics(request)
        if match is not None:
            # modify existing person
            e_entity = econtacts[match].related_entity
            e_entity_id = e_entity.id
            populate_person_attrs(form_set['person'].cleaned_data,
                                  e_entity, merge=True)
            da.entity.save_entity(e_entity)
            e_entity = da.entity.get_entity(e_entity_id)

        else:
            # Look for a related person first
            e_entity = None
            for related_person in [x for x
                                   in applicant.relationships
                                   if x.type != 'Emergency Contact']:
                if _match_related_with_form(related_person.related_entity,
                                            form_set['person']):
                    e_entity = related_person.related_entity

            if e_entity is None:
                # Best be creating a new person.
                e_entity = da.entity.get_new_person()

            populate_person_attrs(form_set['person'].cleaned_data,
                                  e_entity, merge=True)

            if e_entity.id is None:
                e_entity_id = da.entity.save_entity(e_entity)
            else:
                e_entity_id = e_entity.id
                da.entity.save_entity(e_entity)
            e_entity = da.entity.get_entity(e_entity_id)

        return e_entity

    def find_existing_contact_matches(self, forms, econtacts, applicant):
        matches = [None, None]
        for i, form_set in enumerate(forms):
            for j, econtact in enumerate(econtacts):
                relationships = []
                for rel in applicant.relationships:
                    if rel.related_entity.id == econtact.related_entity.id:
                        relationships.append(rel.type)
                if _match_related_with_form(econtact.related_entity,
                                            form_set['person'],
                                            relationships=relationships,
                                            relationship_form=form_set['relationship']):
                    matches[i] = j
        return matches

    def check_submission_validity(self, forms):
        all_valid = True
        for form_set in forms:
            all_valid = all_valid and\
                form_set['relationship'].is_valid() and\
                form_set['email'].is_valid() and\
                form_set['person'].is_valid() and\
                form_set['phone'].is_valid() and\
                form_set['guardian'].is_valid()
            if form_set['existing_address'].is_valid():
                if 'existing_address_id' in form_set['existing_address'].cleaned_data and\
                   (form_set['existing_address'].cleaned_data['existing_address_id'] is None or
                        form_set['existing_address'].cleaned_data['existing_address_id'] == 'None'):
                    all_valid = all_valid and form_set['address'].is_valid()
                else:
                    form_set['address'] = None
            else:
                all_valid = False
        return all_valid

    def process_submitted_data(self, forms_required, request, econtacts, applicant, forms):
        for i, form_set in enumerate(forms):
            form_set['relationship'] = RelationshipTypeForm(
                request.POST,
                required=forms_required,
                prefix=i,
                **self.relationship_kwargs)

            form_set['email'] = EmailAddressForm(request.POST, prefix=i,
                                                 required=forms_required,
                                                 **self.email_kwargs)
            form_set['person'] = PersonForm(request.POST, prefix=i,
                                            required=forms_required,
                                            **self.person_kwargs)
            if i < len(econtacts):
                form_set['existing_address'] = ExistingAddressForm(
                    econtacts[i].related_entity, request.POST,
                    required=forms_required, prefix=i)
            else:
                # Can the existing address form handle this? Is this the source of the
                # address relation errors with the existing address form?
                form_set['existing_address'] = ExistingAddressForm(
                    applicant, request.POST,
                    required=forms_required, prefix=i)
            form_set['address'] = AddressForm(request.POST, prefix=i,
                                              required=forms_required,
                                              **self.address_kwargs)
            form_set['phone'] = PhoneForm(request.POST,
                                          required=forms_required,
                                          prefix='phone-{0}'.format(i),
                                          **self.phone_kwargs)
            form_set['guardian'] = ECGuardianForm(request.POST,
                                                  required=forms_required,
                                                  prefix=i)

    def load_saved_data(self, econtacts, applicant, forms):
        # Recall that forms is a list of two dictionaries. We are calling each dictionary a formset.
        # Each dictionary contains the actual forms.
        for i, form_set in enumerate(forms):
            _key = 'emergency_contact_{0}'.format(i)
            if _key in self.student_form.entered_data:
                if all([form_set[x] is None for x in ['relationship',
                                                      'email',
                                                      'person',
                                                      'existing_address',
                                                      'address',
                                                      'phone',
                                                      'guardian']]):
                    form_set['relationship'] = RelationshipTypeForm(
                        initial=self.student_form.entered_data[_key]['relationship'],
                        prefix=i, **self.relationship_kwargs)
                    form_set['email'] = EmailAddressForm(
                        initial=self.student_form.entered_data[_key]['email'],
                        prefix=i, **self.email_kwargs)
                    form_set['person'] = PersonForm(
                        initial=self.student_form.entered_data[_key]['person'],
                        prefix=i, **self.person_kwargs)
                    if i < len(econtacts):
                        form_set['existing_address'] = ExistingAddressForm(
                            econtacts[i].related_entity,
                            initial=self.student_form.entered_data[_key]['existing_address'],
                            prefix=i)
                    else:
                        form_set['existing_address'] = ExistingAddressForm(
                            applicant,
                            initial=self.student_form.entered_data[_key]['existing_address'],
                            prefix=i)
                    try:
                        form_set['address'] = AddressForm(
                            initial=self.student_form.entered_data[_key]['address'],
                            prefix=i, **self.address_kwargs)
                    except KeyError:
                        # Might not have address set since it's not
                        # always cleaned
                        pass

                    form_set['phone'] = PhoneForm(
                        initial=self.student_form.entered_data[_key]['phone'],
                        prefix='phone-{0}'.format(i), **self.phone_kwargs)
                    form_set['guardian'] = ECGuardianForm(
                        initial=self.student_form.entered_data[_key]['guardian'],
                        prefix=i)

    def load_existing_emergency_contacts(self, applicant, econtacts, forms):
        # We didn't find a draft form with already entered data.
        # If the applicant has existing e-contacts, we prepopulate the forms from information off of
        # those entities.
        nonecontacts = [x for x in applicant.relationships
                        if x.type != 'Emergency Contact']
        for i, econtact in enumerate(econtacts[:2]):
            form_set = forms[i]

            non_econtact = None
            for related in nonecontacts:
                if related.related_entity.id == econtact.related_entity.id:
                    non_econtact = related

            if all([form_set[x] is None for x in ['relationship', 'email',
                                                  'person', 'existing_address',
                                                  'phone']]):

                form_set['relationship'] = RelationshipTypeForm(
                    initial={
                        'relationship_type': non_econtact.type} if non_econtact else {},
                    prefix=i, **self.relationship_kwargs)
                _initial = {}
                _email = econtact.related_entity.get_preferred_email_address()
                if _email is not None:
                    _initial['email_address'] = _email.email_address

                form_set['email'] = EmailAddressForm(initial=_initial,
                                                     prefix=i, **self.email_kwargs)
                _initial = {}
                populate_person_data(econtact.related_entity, _initial)

                # Fix the birthdate to be formatted like an American
                try:
                    _initial['birth_date'] = _initial['birth_date'].strftime(
                        '%m/%d/%Y')
                except:
                    # Maybe it's not that important
                    pass

                form_set['person'] = PersonForm(initial=_initial,
                                                prefix=i, **self.person_kwargs)
                form_set['existing_address'] = ExistingAddressForm(
                    econtact.related_entity, prefix=i)
                _initial = {}
                _phone = econtact.related_entity.get_preferred_phone_number()
                if _phone is not None:
                    populate_phone_data(_phone, _initial)
                form_set['phone'] = PhoneForm(initial=_initial,
                                              prefix='phone-{0}'.format(i),
                                              **self.phone_kwargs)

    def initialize_blank_forms(self, applicant, forms):
        for i, form_set in enumerate(forms):
            if form_set['relationship'] is None:
                form_set['relationship'] = RelationshipTypeForm(
                    prefix=i, **self.relationship_kwargs)
            if form_set['email'] is None:
                form_set['email'] = EmailAddressForm(
                    prefix=i, **self.email_kwargs)
            if form_set['person'] is None:
                form_set['person'] = PersonForm(prefix=i, **self.person_kwargs)
            if form_set['existing_address'] is None:
                form_set['existing_address'] = ExistingAddressForm(
                    applicant, initial={'existing_address_id': ''}, prefix=i)
            if form_set['address'] is None:
                form_set['address'] = AddressForm(
                    prefix=i, **self.address_kwargs)
            if form_set['phone'] is None:
                form_set['phone'] = PhoneForm(prefix='phone-{0}'.format(i),
                                              **self.phone_kwargs)
            if form_set['guardian'] is None:
                form_set['guardian'] = ECGuardianForm(prefix=i)

    def customize_form_rendering(self, forms):
        # Tweak some of the forms for custom render in the templates.
        for i, form_set in enumerate(forms):
            if 'class' not in form_set['address'].fields['country'].widget.attrs:
                form_set['address']\
                    .fields['country']\
                    .widget.attrs['class'] = 'form-country-selection'
            else:
                form_set['address']\
                    .fields['country']\
                    .widget.attrs['class'] += ' form-country-selection'
            form_set['phone'].fields['phone_number'].is_custom_render = True
            form_set['phone'].fields['phone_number'].help_text = '(xxx)xxx-xxxx'
            form_set['phone'].fields['extension'].is_custom_render = True
            form_set['phone'].fields['extension'].label = ''
            form_set['phone'].fields['extension'].help_text = 'Optional phone extension'
            for form in form_set.values():
                if form is not None:
                    form.group_errorlists = True


class EmtPrerequisitesView(BaseStudentFormView):
    def get(self, request):
        self.record_view_analytics(request)
        form_types = StudentFormType.emt_form_types()
        forms = [StudentForm.objects.get_or_create(application=self.csr.application,
                                                   type=form_type)[0]
                 for form_type in form_types]

        clear_emt_form(self.csr, forms)
        upload_form = UploadFileForm()

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'upload_form': upload_form,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        form_types = StudentFormType.emt_form_types()
        upload_form = UploadFileForm(request.POST, request.FILES)
        all_valid = upload_form.is_valid()
        submitted = [form_type for form_type in form_types if
                     slugify(form_type.name) in upload_form.data]

        out_pdf, error = self.processor()(request.FILES)

        if error:
            upload_form._errors['file'] = ErrorList([error])
            all_valid = False

        if all_valid:
            for form_type in submitted:
                try:
                    form = StudentForm.objects.get(application=self.csr.application,
                                                   type=form_type)
                except StudentForm.DoesNotExist:
                    form = StudentForm(application=self.csr.application,
                                       type=form_type)

                form.store_uploaded_data(File(out_pdf))

                form.created = datetime.datetime.now()
                form.status = StudentForm.IN_REVIEW
                form.save()

                # check it off the list
                _check_receipt(self.csr,
                               form,
                               False,
                               False)

        if out_pdf:
            out_pdf.close()

        forms = StudentForm.objects.filter(
            type__in=form_types, application=self.csr.application)
        clear_emt_form(self.csr, forms)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'draft': True,
                        'submission_type': 'save_for_later',
                        'errors': upload_form.errors,
                        'progress': self.csr.percent_ready,
                        })
        )

    def processor(self):
        return _files_to_pdf


class GuardianInfoView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(GuardianInfoView, self).__init__(**kwargs)

        self.relationship_kwargs = {'type_choices': RELATIONSHIP_TYPE_CHOICES.GUARDIAN,
                                    'follow_text': '',
                                    'type_label': 'Relationship to the student'}
        self.email_kwargs = {'email_address_required': True}
        self.person_kwargs = {'collapse_extra_name_fields': True,
                              'show_ethnicity': False,
                              'use_birthdate_widget': False,
                              'birth_date_required': False,
                              'show_gender': False}
        self.address_kwargs = {'type_choices': (('Home', 'Home'),
                                                ('School', 'School'),
                                                ('Work', 'Work'),
                                                ('Other', 'Other'),),
                               'show_organization': False}
        self.phone_kwargs = {'phone_required': True,
                             'type_choices': (('Home', 'Home'),
                                              ('Mobile', 'Mobile'),
                                              ('Work', 'Work'),),
                             'allow_type_update': True}

    def get(self, request):
        self.record_view_analytics(request)
        applicant = self.csr.application.person.entity
        self.forms = []
        for i in range(2):
            self.forms.append({'person_id': None,
                               'relationship': None,
                               'email': None,
                               'person': None,
                               'existing_address': None,
                               'address': None,
                               'phone': None})
        if self.student_form.entered_data:
            self.load_saved_data(applicant)
        self.initialize_blank_forms(applicant)
        self.customize_form_rendering(request)

        # Set these as not required so they don't have the required css class set.
        for i in range(int(applicant.age < OpenApp().guardian_required_age),
                       len(self.forms)):
            for key in self.forms[i]:
                for field in self.forms[i][key].fields:
                    self.forms[i][key].fields[field].required = False

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': self.forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        applicant = self.csr.application.person.entity
        submission_type = self.get_submission_type(request)
        final_submission = submission_type == 'final_submission'
        self.forms = []
        for i in range(2):
            self.forms.append({'person_id': None,
                               'relationship': None,
                               'email': None,
                               'person': None,
                               'existing_address': None,
                               'address': None,
                               'phone': None})
        forms_valid = True

        self.process_submitted_data(request, applicant, submission_type)
        forms_valid = self.check_submission_validity(forms_valid)

        form_sets_contain_data = [True, True]
        for i, form_set in enumerate(self.forms):
            form_sets_contain_data[i] = hasattr(form_set['person'], 'cleaned_data') and\
                any([bool(x)
                     for x in form_set['person'].cleaned_data.values() if x != 'None'])

        if forms_valid and submission_type in self.SAVE_STATES:
            if final_submission:
                self.student_form.status = StudentForm.IN_REVIEW
                self.create_guardian_relationships(
                    applicant, form_sets_contain_data)

            self.save_data(form_sets_contain_data)
            self.student_form.save(store_pdf=True)
            _check_receipt(self.csr, self.student_form, cleared=True)

        self.initialize_blank_forms(applicant)
        self.customize_form_rendering(request)

        # Set these as not required so they don't have the required css class set.
        for i in range(int(applicant.age < OpenApp().guardian_required_age),
                       len(self.forms)):
            for key in self.forms[i]:
                for field in self.forms[i][key].fields:
                    self.forms[i][key].fields[field].required = False

        fragment_context = self.get_fragment_context(self.forms,
                                                     not forms_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': forms_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def create_guardian_relationships(self, applicant, form_sets_contain_data):
        for i, form_set in enumerate(self.forms):
            if form_sets_contain_data[i]:
                if form_set['person_id'].cleaned_data['integer']:
                    entity = da.entity.get_entity(
                        form_set['person_id'].cleaned_data['integer'])
                    if entity and _match_related_with_form(entity,
                                                           form_set['person']):
                        # then we have the right entity
                        pass
                    else:
                        entity = None
                else:
                    entity = None
                if entity is None:
                    for relationship in applicant.relationships:
                        relationships = []
                        for rel in applicant.relationships:
                            if rel.related_entity.id == relationship.related_entity.id:
                                relationships.append(rel.type)

                        if _match_related_with_form(
                                relationship.related_entity,
                                form_set['person'],
                                relationships=relationships,
                                relationship_form=form_set['relationship']):
                            entity = relationship.related_entity
                            break
                    if entity is None:
                        entity = da.entity.get_new_person()

                populate_person_attrs(form_set['person'].cleaned_data,
                                      entity, merge=True)

                entity_id = entity.id or da.entity.save_entity(entity)
                entity = da.entity.get_entity(entity_id)
                form_set['person_id']\
                    .cleaned_data['integer'] = entity.id

                _set_entity_from_formset(entity, applicant, form_set)
                relationship_type = form_set['relationship']\
                    .cleaned_data['relationship_type']
                if not relationship_is_guardian(relationship_type):
                    _create_entity_relationship(applicant, entity_id,
                                                'Guardian')

    def save_data(self, form_sets_contain_data):
        for i, form_set in enumerate(self.forms):
            if form_sets_contain_data[i]:
                self.student_form.entered_data['guardian_info_{0}'.format(i)] = {
                }
                for key, form in form_set.items():
                    if key == 'existing_address' and\
                       form is not None and\
                       form.cleaned_data['existing_address_id'] is not None and\
                       form.cleaned_data['existing_address_id'] != 'None':
                        self.student_form\
                            .entered_data['guardian_info_{0}'
                                          .format(i)]['address'] = {}
                        populate_address_data(
                            da.entity.get_address(
                                form.cleaned_data['existing_address_id']),
                            self.student_form.entered_data['guardian_info_{0}'
                                                           .format(i)]['address'])
                    elif form is not None:
                        self.student_form\
                            .entered_data['guardian_info_{0}'
                                          .format(i)][key] = form.cleaned_data

    def check_submission_validity(self, forms_valid):
        for i, form_set in enumerate(self.forms):
            forms_valid = forms_valid and\
                form_set['person_id'].is_valid() and\
                form_set['relationship'].is_valid() and\
                form_set['email'].is_valid() and\
                form_set['person'].is_valid() and\
                form_set['phone'].is_valid()

            if form_set['existing_address'].is_valid():
                if form_set['existing_address'].cleaned_data['existing_address_id'] is None or\
                   form_set['existing_address'].cleaned_data['existing_address_id'] == 'None':
                    forms_valid = forms_valid and\
                        form_set['address'].is_valid()
                else:
                    form_set['address'] = None
            else:
                forms_valid = False

        return forms_valid

    def process_submitted_data(self, request, applicant, submission_type):
        forms_required = submission_type in self.VALIDATION_STATES
        for i, form_set in enumerate(self.forms):
            not_required = i > 0 or\
                applicant.age >= float(OpenApp().guardian_required_age)
            this_required = forms_required and not not_required
            form_set['person_id'] = HiddenIntegerForm(request.POST, prefix=i)
            form_set['relationship'] = RelationshipTypeForm(
                request.POST, required=this_required,
                prefix=i, **self.relationship_kwargs)
            form_set['email'] = EmailAddressForm(
                request.POST, required=this_required,
                prefix=i, **self.email_kwargs)
            form_set['person'] = PersonForm(
                request.POST, prefix=i, required=this_required,
                **self.person_kwargs)
            if form_set['person_id'].is_valid() and\
               form_set['person_id'].cleaned_data['integer']:
                existing_entity = da.entity.get_entity(
                    form_set['person_id'].cleaned_data['integer'])
                form_set['existing_address'] = ExistingAddressForm(
                    existing_entity, request.POST,
                    required=this_required,
                    prefix=i)
            else:
                form_set['existing_address'] = ExistingAddressForm(
                    applicant, request.POST, required=this_required,
                    prefix=i)
            form_set['address'] = AddressForm(request.POST, prefix=i,
                                              required=this_required,
                                              **self.address_kwargs)
            form_set['phone'] = PhoneForm(
                request.POST, prefix='phone-{0}'.format(i),
                required=this_required,
                **self.phone_kwargs)

            if submission_type in self.VALIDATION_STATES:
                # Need to check if they entered any data.
                # If so, require the form and re-clean

                any_data = False
                for key, form in form_set.items():
                    form.full_clean()
                    if not hasattr(form, 'cleaned_data'):
                        # Then validation failed, meaning there was bad data
                        any_data = True
                        break
                    else:
                        if key == 'person_id':
                            continue
                        if any([bool(x) for x in form.cleaned_data.values()
                                if x != 'None']):
                            any_data = True
                            break

                if any_data:
                    for fkey in form_set:
                        form_set[fkey].required = True
                        form_set[fkey].full_clean()

    def customize_form_rendering(self, request):
        form_errors = [False, False]
        for i, form_set in enumerate(self.forms):
            if form_set['address'] is None:
                form_set['address'] = AddressForm(request.POST, prefix=i,
                                                  **self.address_kwargs)
            if 'class' not in form_set['address'].fields['country'].widget.attrs:
                form_set['address']\
                    .fields['country']\
                    .widget.attrs['class'] = 'form-country-selection'
            else:
                form_set['address']\
                    .fields['country']\
                    .widget.attrs['class'] += ' form-country-selection'
            form_set['phone'].fields['phone_number'].is_custom_render = True
            form_set['phone'].fields['phone_number'].help_text = '(xxx)xxx-xxxx'
            form_set['phone'].fields['extension'].is_custom_render = True
            form_set['phone'].fields['extension'].label = ''
            form_set['phone'].fields['extension'].help_text = 'Optional phone extension'
            for form in form_set.values():
                if form is not None:
                    form.group_errorlists = True
                    if form.errors:
                        form_errors[i] = True

    def load_saved_data(self, applicant):
        for i, form_set in enumerate(self.forms):
            _key = 'guardian_info_{0}'.format(i)
            if _key in self.student_form.entered_data:
                if 'person_id' in self.student_form.entered_data[_key] and\
                   form_set['person_id'] is None:
                    form_set['person_id'] = HiddenIntegerForm(
                        initial=self.student_form.entered_data[_key]['person_id'],
                        prefix=i)

                if all([x in self.student_form.entered_data[_key] for x in
                        ['relationship', 'email', 'person', 'existing_address', 'phone']]) and\
                        all([form_set[x] is None for x in ['relationship',
                                                           'email',
                                                           'person',
                                                           'existing_address',
                                                           'phone']]):

                    form_set['relationship'] = RelationshipTypeForm(
                        initial=self.student_form.entered_data[_key]['relationship'],
                        prefix=i, **self.relationship_kwargs)
                    form_set['email'] = EmailAddressForm(
                        initial=self.student_form.entered_data[_key]['email'],
                        prefix=i, **self.email_kwargs)
                    form_set['person'] = PersonForm(
                        initial=self.student_form.entered_data[_key]['person'],
                        prefix=i, **self.person_kwargs)
                    if 'person_id' in self.student_form.entered_data and\
                            self.student_form.entered_data[_key]['person_id']['integer']:

                        form_set['existing_address'] = ExistingAddressForm(
                            da.entity.get_entity(
                                self.student_form.entered_data[_key]['person_id']['integer']),
                            initial=self.student_form.entered_data[_key]['existing_address'],
                            prefix=i)
                    else:
                        form_set['existing_address'] = ExistingAddressForm(
                            applicant,
                            initial=self.student_form.entered_data[_key]['existing_address'],
                            prefix=i)
                    try:
                        form_set['address'] = AddressForm(
                            initial=self.student_form.entered_data[_key]['address'],
                            prefix=i, **self.address_kwargs)
                    except KeyError:
                        # Might not have address set since it's
                        # not always cleaned
                        pass

                    form_set['phone'] = PhoneForm(
                        initial=self.student_form.entered_data[_key]['phone'],
                        prefix='phone-{0}'.format(i), **self.phone_kwargs)
                elif 'person_id' in self.student_form.entered_data[_key] and\
                     self.student_form.entered_data[_key]['person_id']:
                    matching_relationships = [
                        x for x in applicant.relationships
                        if x.type in [y[0] for y
                                      in RELATIONSHIP_TYPE_CHOICES.GUARDIAN]
                        and
                        x.related_entity.id == self.student_form
                        .entered_data[_key]['person_id']['integer']]
                    try:
                        relationship = matching_relationships[0]
                    except IndexError:
                        # So the most likely cause of this is that from the
                        # point of taking a course to the next time they take
                        # a course the relationship has dissolved.
                        # That's sad. Let not burden them with a reminder.
                        continue

                    if all([form_set[x] is None for x in ['relationship',
                                                          'email',
                                                          'person',
                                                          'existing_address',
                                                          'phone']]):
                        form_set['relationship'] = RelationshipTypeForm(
                            initial={'relationship_type': relationship.type},
                            prefix=i, **self.relationship_kwargs)

                        email = relationship.related_entity.get_preferred_email_address()
                        email = email.email_address if email else ''

                        form_set['email'] = EmailAddressForm(
                            initial={'email_address': email},
                            prefix=i, **self.email_kwargs)
                        _initial = {}
                        populate_person_data(relationship.related_entity,
                                             _initial)
                        # Fix the birthdate to be formatted like an American
                        try:
                            _initial['birth_date'] = _initial['birth_date'].strftime(
                                '%m/%d/%Y')
                        except:
                            # Maybe it's not the important
                            pass
                        form_set['person'] = PersonForm(
                            initial=_initial, prefix=i, **self.person_kwargs)
                        form_set['existing_address'] = ExistingAddressForm(
                            relationship.related_entity, prefix=i)
                        _initial = {}
                        populate_phone_data(relationship
                                            .related_entity
                                            .get_preferred_phone_number(),
                                            _initial)
                        form_set['phone'] = PhoneForm(
                            initial=_initial, prefix='phone-{0}'.format(i),
                            **self.phone_kwargs)

    def initialize_blank_forms(self, applicant):
        for i, form_set in enumerate(self.forms):
            if form_set['person_id'] is None:
                form_set['person_id'] = HiddenIntegerForm(prefix=i)
            if form_set['relationship'] is None:
                form_set['relationship'] = RelationshipTypeForm(
                    prefix=i, **self.relationship_kwargs)
            if form_set['email'] is None:
                form_set['email'] = EmailAddressForm(
                    prefix=i, **self.email_kwargs)
            if form_set['person'] is None:
                form_set['person'] = PersonForm(prefix=i, **self.person_kwargs)
            if form_set['existing_address'] is None:
                form_set['existing_address'] = ExistingAddressForm(
                    applicant, initial={'existing_address_id': ''}, prefix=i)
            if form_set['address'] is None:
                form_set['address'] = AddressForm(
                    prefix=i, **self.address_kwargs)
            if form_set['phone'] is None:
                form_set['phone'] = PhoneForm(prefix='phone-{0}'.format(i),
                                              **self.phone_kwargs)


class InsuranceInfoView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(InsuranceInfoView, self).__init__(**kwargs)

        self.person_kwargs = {'collapse_extra_name_fields': True,
                              'show_ethnicity': False,
                              'show_gender': False,
                              'use_birthdate_widget': False}
        self.address_kwargs = {'type_choices': (('Home', 'Home'),
                                                ('School', 'School'),
                                                ('Work', 'Work'),
                                                ('Other', 'Other'),),
                               'show_organization': False}
        self.phone_kwargs = {'phone_required': True,
                             'type_choices': (('Home', 'Home'),
                                              ('Mobile', 'Mobile'),
                                              ('Work', 'Work'),),
                             'allow_type_update': True}

        self.forms = {
            'policy_holder': {
                'person': None,
                'existing_address': None,
                'address': None,
                'phone': None},
            'insurance': {
                'info': None,
                'claims_phone': None,
            }
        }

    def get(self, request):
        self.record_view_analytics(request)
        applicant = da.entity.get_entity(self.csr.application.person.pk)
        self.initialize_forms(applicant)
        self.customize_form_rendering()
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': self.forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        applicant = da.entity.get_entity(self.csr.application.person.pk)
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        final_submission = submission_type == 'final_submission'
        all_valid = True

        self.process_submitted_data(forms_required, applicant, request)

        if self.forms['policy_holder']['existing_address'].is_valid():
            if (self.forms['policy_holder']['existing_address']
                .cleaned_data['existing_address_id'] is None or
                self.forms['policy_holder']['existing_address']
                    .cleaned_data['existing_address_id'] == 'None'):
                all_valid = all_valid and\
                    self.forms['policy_holder']['address'].is_valid()
            else:
                self.forms['policy_holder']['address'] = None
        else:
            all_valid = False

        all_valid = all_valid and\
            self.forms['policy_holder']['person'].is_valid() and\
            self.forms['policy_holder']['phone'].is_valid() and\
            self.forms['insurance']['info'].is_valid() and\
            self.forms['insurance']['claims_phone'].is_valid()

        log.debug(all_valid)

        if all_valid and submission_type in self.SAVE_STATES:
            if final_submission:
                self.student_form.status = StudentForm.IN_REVIEW
            else:
                self.student_form.status = StudentForm.DRAFT

            if final_submission:
                if (self.forms['policy_holder']['existing_address']
                        .cleaned_data['existing_address_id'] is not None):
                    address = da.entity.get_address(
                        self.forms['policy_holder']['existing_address']
                        .cleaned_data['existing_address_id'])
                    if self.forms['policy_holder']['address']:
                        self.forms['policy_holder']['address'].cleaned_data = {}
                    else:
                        self.forms['policy_holder']['address'] = AddressForm(required=False,
                                                                             **self.address_kwargs)
                        self.forms['policy_holder']['address'].full_clean()
                    populate_address_data(
                        address,
                        self.forms['policy_holder']['address'].cleaned_data)
                    self.forms['policy_holder']['existing_address'] = None

            for fs_key, form_set in self.forms.items():
                self.student_form.entered_data[fs_key] = {}
                for form_key in form_set:
                    if hasattr(form_set[form_key], 'cleaned_data'):
                        self.student_form\
                            .entered_data[fs_key][form_key] = form_set[form_key].cleaned_data

            self.student_form.save(store_pdf=True)
            _check_receipt(self.csr, self.student_form, cleared=True)

        self.initialize_forms(applicant)
        self.customize_form_rendering()

        fragment_context = self.get_fragment_context(self.forms,
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def initialize_forms(self, applicant):
        if self.forms['policy_holder']['person'] is None:
            _initial = {}
            try:
                _initial = self.student_form.entered_data['policy_holder']['person']
            except KeyError:
                pass
            self.forms['policy_holder']['person'] = PersonForm(initial=_initial,
                                                               **self.person_kwargs)

        if self.forms['policy_holder']['existing_address'] is None:
            _initial = {}
            try:
                _initial = self.student_form\
                    .entered_data['policy_holder']['existing_address']
            except KeyError:
                try:
                    if self.student_form.entered_data['policy_holder']['address']:
                        _initial['existing_address_id'] = None
                except KeyError:
                    pass
            self.forms['policy_holder']['existing_address'] = ExistingAddressForm(
                applicant, initial=_initial)

        if self.forms['policy_holder']['address'] is None:
            _initial = {}
            try:
                _initial = self.student_form.entered_data['policy_holder']['address']
            except KeyError:
                pass
            self.forms['policy_holder']['address'] = AddressForm(initial=_initial,
                                                                 **self.address_kwargs)

        if self.forms['policy_holder']['phone'] is None:
            _initial = {}
            try:
                _initial = self.student_form.entered_data['policy_holder']['phone']
            except KeyError:
                pass
            self.forms['policy_holder']['phone'] = PhoneForm(initial=_initial,
                                                             prefix='policy_holder',
                                                             **self.phone_kwargs)

        if self.forms['insurance']['info'] is None:
            _initial = {}
            try:
                _initial = self.student_form.entered_data['insurance']['info']
            except KeyError:
                pass
            self.forms['insurance']['info'] = InsuranceInfoForm(
                initial=_initial)

        if self.forms['insurance']['claims_phone'] is None:
            _initial = {}
            try:
                _initial = self.student_form.entered_data['insurance']['claims_phone']
            except KeyError:
                pass
            self.forms['insurance']['claims_phone'] = PhoneForm(
                initial=_initial, prefix='insurance', set_type='Work', phone_required=True)

    def customize_form_rendering(self):
        self.forms['policy_holder']['phone']\
            .fields['phone_number'].is_custom_render = True
        self.forms['policy_holder']['phone']\
            .fields['phone_number'].help_text = '(xxx)xxx-xxxx'
        self.forms['policy_holder']['phone']\
            .fields['extension'].is_custom_render = True
        self.forms['policy_holder']['phone']\
            .fields['extension'].label = ''
        self.forms['policy_holder']['phone']\
            .fields['extension'].help_text = 'Optional phone extension'

        self.forms['insurance']['claims_phone']\
            .fields['phone_number'].is_custom_render = True
        self.forms['insurance']['claims_phone']\
            .fields['phone_number'].label = "Insurer's phone number"
        self.forms['insurance']['claims_phone']\
            .fields['phone_number'].help_text = '(xxx)xxx-xxxx'
        self.forms['insurance']['claims_phone']\
            .fields['extension'].is_custom_render = True
        self.forms['insurance']['claims_phone']\
            .fields['extension'].label = ''
        self.forms['insurance']['claims_phone']\
            .fields['extension'].help_text = 'Optional phone extension'

        if 'class' not in self.forms['policy_holder']['address'].fields['country']\
                .widget.attrs:
            self.forms['policy_holder']['address']\
                .fields['country'].widget.attrs['class'] = 'form-country-selection'
        else:
            self.forms['policy_holder']['address']\
                .fields['country']\
                .widget.attrs['class'] += ' form-country-selection'

        for form_set in self.forms.values():
            for form in form_set.values():
                form.group_errorlists = True

    def process_submitted_data(self, forms_required, applicant, request):
        self.forms['policy_holder']['person'] = PersonForm(request.POST,
                                                           required=forms_required,
                                                           **self.person_kwargs)
        self.forms['policy_holder']['existing_address'] = ExistingAddressForm(
            applicant, request.POST,
            required=forms_required)
        self.forms['policy_holder']['address'] = AddressForm(request.POST,
                                                             required=forms_required,
                                                             **self.address_kwargs)
        self.forms['policy_holder']['phone'] = PhoneForm(request.POST,
                                                         required=forms_required,
                                                         prefix='policy_holder',
                                                         **self.phone_kwargs)

        self.forms['insurance']['info'] = InsuranceInfoForm(request.POST,
                                                            required=forms_required)
        self.forms['insurance']['claims_phone'] = PhoneForm(
            request.POST, prefix='insurance',
            required=forms_required,
            set_type='Work', phone_required=True)


class StudentInfoView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(StudentInfoView, self).__init__(**kwargs)

        self.form_types = {'academic_professional_history': AcademicProfessionalHistoryForm,
                           'student_questionnaire': StudentQuestionnaireForm,
                           'other': StudentInfoOtherForm}

        self.forms = {'extra_curricular': {'number': None,
                                           'data_forms': None,
                                           'blank_form': ExtraCurricularForm
                                           (prefix='extra_curricular')}}

    def get(self, request):
        self.record_view_analytics(request)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'ha_details_map': HEARD_ABOUT_DETAILS_LABEL_MAP,
                       'forms': self.setup_forms(),
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        log.debug(request.POST)
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES

        all_valid = True
        all_valid = all_valid and self.process_extracurricular_form(
            request, forms_required)

        for form_type, form_class in self.form_types.items():
            self.forms[form_type] = form_class(request.POST, prefix=form_type,
                                               required=forms_required)
            all_valid = all_valid and self.forms[form_type].is_valid()

        if all_valid and submission_type in self.SAVE_STATES:
            if submission_type == 'final_submission':
                self.student_form.status = StudentForm.IN_REVIEW
                self.update_core_db_info()

            log.debug(self.forms['student_questionnaire'].cleaned_data)

            self.student_form.entered_data['extra_curricular'] = []
            for i in range(self.forms['extra_curricular']['number']
                           .cleaned_data['number']):
                self.student_form.entered_data['extra_curricular']\
                    .append(self.forms['extra_curricular']['data_forms'][i]
                            .cleaned_data)

            for form_type in self.form_types:
                self.student_form.entered_data[form_type]\
                    = self.forms[form_type].cleaned_data

            self.student_form.save(store_pdf=True)

            # Ultimately our goal is to kill email notifications, but we're not quite there yet.
            # To keep this notification working, somebody needs to maintain the 'SIF' (aka
            # Student Info Form Submission) list in the admin control panel Mailing List Entry
            # screen. The people who are currently working in the following roles should be on
            # the list:
            # - Marketing Director (09Oct15: Kary Sommers <kary_sommers@nols.edu>)
            # - Marketing "referrer followup" (09Oct15: Open position. Marina used to do this.)
            # - Development (09Oct15: Jennifer Connell <jennifer_connell@nols.edu>)
            recipient_list = MailingListEntry.get_mailing_list('SIF')
            _check_receipt(self.csr, self.student_form,
                           recipient_list=recipient_list)

        fragment_context = self.get_fragment_context(self.forms,
                                                     not all_valid,
                                                     request)
        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'ha_details_map': HEARD_ABOUT_DETAILS_LABEL_MAP,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def initialize_extra_curricular_form(self):
        if self.forms['extra_curricular']['number'] is None:
            _initial = {}
            if 'extra_curricular' in self.student_form.entered_data and\
               len(self.student_form.entered_data['extra_curricular']) > 0:
                _initial['number'] = len(
                    self.student_form.entered_data['extra_curricular'])

                self.forms['extra_curricular']['data_forms'] = []
                for i, initial_form in enumerate(self.student_form
                                                 .entered_data['extra_curricular']):
                    _prefix = '{type}-{num}'.format(type='extra_curricular',
                                                    num=i)
                    self.forms['extra_curricular']['data_forms'].append(
                        ExtraCurricularForm(prefix=_prefix,
                                            initial=initial_form))

            self.forms['extra_curricular']['number'] = NumberOfForms(prefix='extra_curricular',
                                                                     initial=_initial)

            if self.forms['extra_curricular']['data_forms'] is None:
                self.forms['extra_curricular']['data_forms'] = [ExtraCurricularForm(
                    prefix='{type}-0'
                    .format(type='extra_curricular'))]

    def initialize_academic_professional_history_form(self, _initial):
        _initial.setdefault(
            'name_of_school',
            self.student_form.application.person.entity.last_school)
        _initial.setdefault(
            'currently_enrolled',
            self.student_form.application.person.entity.currently_enrolled)
        try:
            _latest_employer = sorted(
                self.student_form.application.person.entity
                .employment_history,
                key=lambda x: x.mod_date,
                reverse=True)[0]
        except IndexError:
            _latest_employer = None

        if _latest_employer is not None:
            _initial.setdefault('employer',
                                _latest_employer.organization)
            _initial.setdefault('job_title',
                                _latest_employer.title)
            _initial.setdefault('industry',
                                _latest_employer.occupation)

    def setup_forms(self):
        for form_type in self.form_types:
            self.forms[form_type] = None

        self.initialize_extra_curricular_form()

        for form_type, form_class in self.form_types.items():
            if form_type != 'extra_curricular':
                _initial = {}
                if self.student_form.entered_data and\
                   form_type in self.student_form.entered_data and\
                   self.student_form.entered_data[form_type]:
                    _initial = self.student_form.entered_data[form_type]
                if form_type == 'academic_professional_history':
                    self.initialize_academic_professional_history_form(
                        _initial)
                if form_type == 'student_questionnaire':
                    self.forms[form_type] = form_class(
                        initial=_initial,
                        proxy_entity_id=self.student_form.application.person.pk,
                        prefix=form_type)
                else:
                    self.forms[form_type] = form_class(initial=_initial,
                                                       prefix=form_type)

        return self.forms

    def process_extracurricular_form(self, request, forms_required):
        all_valid = False
        self.forms['extra_curricular']['number'] = NumberOfForms(request.POST,
                                                                 prefix='extra_curricular')

        if self.forms['extra_curricular']['number'].is_valid():
            self.forms['extra_curricular']['data_forms'] = []
            for i in range(self.forms['extra_curricular']['number']
                           .cleaned_data['number']):
                self.forms['extra_curricular']['data_forms']\
                    .append(ExtraCurricularForm(request.POST,
                                                required=forms_required,
                                                prefix='{type}-{num}'
                                                .format(
                                                    type='extra_curricular',
                                                    num=i)))
            for form in self.forms['extra_curricular']['data_forms']:
                all_valid = form.is_valid()
        else:
            # Add to message number of forms without causing more errors
            try:
                msg = "# of extra_curricular forms is %s" % \
                      self.forms['extra_curricular']['number']['number'].value()
            except:
                msg = "The NumberOfForms form does not have a number value."
                log.exception(msg)

            raise Exception("The NumberOfForms form is invalid. %s" % msg)

        return all_valid

    def update_core_db_info(self):
        # Just need a shorthand.
        aph = 'academic_professional_history'

        self.student_form.application.person.entity.last_school\
            = self.forms[aph].cleaned_data['name_of_school']
        self.student_form.application.person.entity.currently_enrolled\
            = self.forms[aph].cleaned_data['currently_enrolled']

        found = False
        for employment_history in self.student_form.application.person.entity.employment_history:
            if employment_history.organization\
               == self.forms[aph].cleaned_data['employer'] and\
               employment_history.title\
               == self.forms[aph].cleaned_data['job_title'] and\
               employment_history.occupation\
               == self.forms[aph].cleaned_data['industry']:
                found = True
                break
        if not found and\
           ((self.forms[aph].cleaned_data['employer'] or
             self.forms[aph].cleaned_data['job_title'] or
             self.forms[aph].cleaned_data['industry'])):
            new_ehistory = da.entity.get_new_employment_history(
                self.student_form.application.person.pk)
            new_ehistory.organization\
                = self.forms[aph].cleaned_data['employer']
            new_ehistory.title\
                = self.forms[aph].cleaned_data['job_title']
            new_ehistory.occupation\
                = self.forms[aph].cleaned_data['industry']
            da.entity.save_employment_history(new_ehistory)

        populate_person_attrs(self.forms['student_questionnaire'].cleaned_data,
                              self.student_form.application.person.entity)
        da.entity.save_entity(self.student_form.application.person.entity)

        # 'Cause, you know, it's invalid now.
        del self.student_form.application.person.entity


class TravelAndLogisticsView(BaseStudentFormView):
    def __init__(self, **kwargs):
        super(TravelAndLogisticsView, self).__init__(**kwargs)

        self.forms = {'main': None,
                      'passport': None,
                      'arrival_info': None,
                      'departure_info': None}

    def get(self, request):
        self.record_view_analytics(request)
        passport_expiration_date = self.csr.course.end_date + \
            relativedelta(months=6)
        self.load_saved_forms()

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': self.forms,
                       'passport_expiration_date': passport_expiration_date,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        need_passport, need_passport_checkbox, need_visa = self.csr.need_passport_visa()

        all_valid = False
        self.process_submitted_data(request, submission_type)
        all_valid = all(form.is_valid()
                        for form in self.forms.itervalues() if form)

        if all_valid and submission_type in self.SAVE_STATES:
            if self.show_travel_info() and \
               submission_type == 'final_submission' and \
               (self.forms['arrival_info']
                .cleaned_data['arrival_date']
                >
                self.forms['departure_info']
                    .cleaned_data['departure_date']):
                self.forms['departure_info'].errors['departure_date'] = \
                    self.forms['departure_info'].error_class(
                        ['Departure date must be after arrival date.'])
                all_valid = False
            else:
                if submission_type == 'final_submission':
                    self.student_form.status = StudentForm.IN_REVIEW
                self.student_form.entered_data = self.forms['main'].cleaned_data
                if need_passport:
                    self.student_form.entered_data.update(
                        self.forms['passport'].cleaned_data)
                if self.show_travel_info():
                    self.student_form.entered_data.update(
                        self.forms['arrival_info'].cleaned_data)
                    self.student_form.entered_data.update(
                        self.forms['departure_info'].cleaned_data)
                self.student_form.save(store_pdf=True)

                if self.show_travel_info():
                    _check_receipt(self.csr, self.student_form)
                else:
                    _check_receipt(self.csr, self.student_form,
                                   cleared=True, ignore_mail=True)

        fragment_context = self.get_fragment_context(self.forms,
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def process_submitted_data(self, request, submission_type):
        forms_required = submission_type in self.VALIDATION_STATES
        need_passport, need_passport_checkbox, need_visa = self.csr.need_passport_visa()
        self.forms['main'] = TravelAndLogisticsForm(
            data=request.POST,
            include_visa=need_visa,
            include_passport_checkbox=need_passport_checkbox,
            required=forms_required)
        if need_passport:
            self.forms['passport'] = TravelAndLogisticsPassportForm(
                data=request.POST, required=forms_required)

        if self.forms['arrival_info'] is None and self.show_travel_info():
            self.forms['arrival_info'] = TravelAndLogisticsArrivalForm(data=request.POST,
                                                                       required=forms_required)

        if self.forms['departure_info'] is None and self.show_travel_info():
            self.forms['departure_info'] = TravelAndLogisticsDepartureForm(data=request.POST,
                                                                           required=forms_required)

    def load_saved_forms(self):
        need_passport, need_passport_checkbox, need_visa = self.csr.need_passport_visa()

        _initial = {}
        if self.student_form.entered_data:
            _initial = self.student_form.entered_data

        if self.forms['main'] is None:
            self.forms['main'] = TravelAndLogisticsForm(
                initial=_initial,
                include_visa=need_visa,
                include_passport_checkbox=need_passport_checkbox)
        if self.forms['passport'] is None and need_passport:
            self.forms['passport'] = TravelAndLogisticsPassportForm(
                initial=_initial)

        if self.forms['arrival_info'] is None and self.show_travel_info():
            self.forms['arrival_info'] = TravelAndLogisticsArrivalForm(
                initial=_initial)

        if self.forms['departure_info'] is None and self.show_travel_info():
            self.forms['departure_info'] = TravelAndLogisticsDepartureForm(
                initial=_initial)

    def show_travel_info(self):
        course = self.csr.course
        if course.is_pro and course.locations:
            return True
        return (course.minimum_age <= 14 or course.course_code == 'AHC2')


class TuitionProtectionPlanView(BaseStudentFormView):
    def get(self, request):
        self.record_view_analytics(request)
        form = TuitionProtectionPlanForm()
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': {'tuition_protection_plan': form},
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)

        all_valid = False
        student_form = self.student_form
        form = TuitionProtectionPlanForm(request.POST, required=True)
        csr = self.csr

        if form.is_valid() and csr.course.has_tpp and csr.still_enrolled():
            try:
                user = request.user
                application = student_form.application
                previous_decision = application.tuition_protection_decision

                decision = form.cleaned_data['decision']
                country = form.cleaned_data['country']
                region = form.cleaned_data['region']

                application.record_tuition_protection_preferences(decision=decision,
                                                                  country=country,
                                                                  region=region,
                                                                  csr=csr,
                                                                  user=user)

                if decision == 'Yes' and not csr.has_active_tpp() and not previous_decision:
                    # create tuition protection entry in AccountTab and FtrTab
                    note = u'Enroll TPP - {first} {last} ({username}) enrolled online for {course}.'
                    note = note.format(first=user.first_name,
                                       last=user.last_name,
                                       username=user.username,
                                       course=csr.course)

                    application.create_tuition_protection_entry(csr, note)

                    application.send_tuition_protection_email()
            except Exception as e:
                user = request.user
                message = u'Failed to process Tuition Protection Plan request for user {user} \
                            with AppId {appId} due to Exception: {exception}'
                message = message.format(
                    user=user, appId=application.id, exception=e)
                log.exception(message)
                application.cancel_and_cleanup_tpp_enrollment(
                    csr, user, total_reset=True)

            else:
                all_valid = True
                student_form.status = StudentForm.CLEARED
                student_form.entered_data['Decision'] = decision
                student_form.entered_data['Country'] = country
                student_form.entered_data['Region'] = region
                student_form.save()

        fragment_context = self.get_fragment_context({'tuition_protection_plan': form},
                                                     not all_valid,
                                                     request)

        self.record_finalize_analytics(request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppTopChoicesView(BaseStudentFormView):
    NUM_COURSE_CHOICES = 3

    def __init__(self, **kwargs):
        super(IcAppTopChoicesView, self).__init__(**kwargs)
        self.forms = [None] * self.NUM_COURSE_CHOICES

    def get(self, request):
        self.initialize_blank_forms()
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': self.forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        all_valid = True

        self.process_submitted_data(request, submission_type)
        all_valid = self.check_submission_validity(all_valid)

        if all_valid and submission_type in self.SAVE_STATES:
            if 'choices' not in self.student_form.entered_data:
                self.student_form.entered_data['choices'] = [
                    {}] * len(self.forms)
            for i in range(len(self.forms)):
                self.student_form.entered_data['choices'][i] = self.forms[i].cleaned_data
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED

            self.student_form.save(store_pdf=True)
            _check_ic_receipt(self.csr, self.student_form)

        self.initialize_blank_forms()
        fragment_context = self.get_fragment_context(self.forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

    def process_submitted_data(self, request, submission_type):
        forms_required = submission_type in self.VALIDATION_STATES
        for i in range(len(self.forms)):
            self.forms[i] = ICChoiceForm(data=request.POST,
                                         required=forms_required,
                                         start_date=self.csr.course.course_date,
                                         prefix=str(i))
            if i > 0:
                for field in self.forms[i].fields.values():
                    field.required = False

    def check_submission_validity(self, all_valid):
        for form in self.forms:
            all_valid = all_valid and form.is_valid()

        return all_valid

    def initialize_blank_forms(self):
        for i in range(len(self.forms)):
            if self.forms[i] is None:
                _initial = {}
                if 'choices' in self.student_form.entered_data and\
                   len(self.student_form.entered_data['choices']) == len(self.forms):
                    _initial = self.student_form.entered_data['choices'][i]
                self.forms[i] = ICChoiceForm(initial=_initial,
                                             start_date=self.csr.course.course_date,
                                             prefix=str(i))
                if i > 0:
                    for field in self.forms[i].fields.values():
                        field.required = False


class IcAppApplicantInfoView(BaseStudentFormView):
    def get(self, request):
        initial = self.student_form.entered_data

        main_form = ICApplicantForm(initial=initial)
        emp_edu_form = ICAppEmploymentEducationForm(initial=initial)
        update_form = ICAppUpdateForm(initial=initial)

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': {'emp_edu_form': emp_edu_form,
                                 'main_form': main_form,
                                 'update_form': update_form},
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        all_valid = True
        main_form = ICApplicantForm(data=request.POST,
                                    required=forms_required)
        emp_edu_form = ICAppEmploymentEducationForm(
            data=request.POST, required=forms_required)
        update_form = ICAppUpdateForm(
            data=request.POST, required=forms_required)
        all_valid = all([f.is_valid() for f in [main_form,
                                                emp_edu_form,
                                                update_form]])

        if all_valid and submission_type in self.SAVE_STATES:
            entered_data = emp_edu_form.cleaned_data
            entered_data.update(main_form.cleaned_data)
            entered_data.update(update_form.cleaned_data)
            self.student_form.entered_data = entered_data
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED
            self.student_form.save(store_pdf=True)
            _check_ic_receipt(self.csr, self.student_form)

        fragment_context = self.get_fragment_context({'emp_edu_form': emp_edu_form,
                                                      'main_form': main_form,
                                                      'update_form': update_form},
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppQuestionnaireView(BaseStudentFormView):
    def get(self, request):
        forms = {'questions': None}
        if forms['questions'] is None:
            forms['questions'] = ICQuestionnaire(
                initial=self.student_form.entered_data)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        forms = {'questions': None}
        all_valid = True
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        forms['questions'] = ICQuestionnaire(
            data=request.POST, required=forms_required)
        all_valid = forms['questions'].is_valid()
        if all_valid and submission_type in self.SAVE_STATES:
            self.student_form.entered_data = forms['questions'].cleaned_data
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED
            context = {
                'timestamp': datetime.datetime.now(),
                'app_id': str(self.csr.application.id),
            }
            responses = json.loads(
                self.student_form.entered_data['blob_of_json'])
            context.update(responses)
            # StudentForm.save() uses hidden magic to render and save a pdf template. The
            # interesting bit happens in StudentForm.store_uploaded_data() where a pdf
            # template filename gets derived from the StudentFormType slug. I don't know
            # why StudentForm got built this way, but that's how it works.
            self.student_form.save(store_pdf=True, extra_context=context)
            _check_ic_receipt(self.csr, self.student_form, cleared=False)

        if forms['questions'] is None:
            forms['questions'] = ICQuestionnaire(
                initial=self.student_form.entered_data)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppTripLogView(BaseStudentFormView):
    def get(self, request):
        forms = {'questions': None}
        if forms['questions'] is None:
            forms['questions'] = ICTripLog(
                initial=self.student_form.entered_data)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        forms = {'questions': None}
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        all_valid = True

        forms['questions'] = ICTripLog(
            data=request.POST, required=forms_required)
        all_valid = all_valid and forms['questions'].is_valid()
        if all_valid and submission_type in self.SAVE_STATES:
            self.student_form.entered_data = forms['questions'].cleaned_data
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED
            context = {
                'timestamp': datetime.datetime.now(),
                'app_id': str(self.csr.application.id),
            }
            # This little contortion is because the trip log form uses javascript to combine
            # 200+ textarea values into one JSON field before POSTing it. The idea is that
            # since the StudentForm model already mushes everything into one field, we might as
            # well save on some typing (i.e. use for loops in the templates instead of typing
            # a couple hundred unique field names in several places).
            #
            # NOTE: This json.loads(...) is a bit risky... more error handling here might be good
            responses = json.loads(
                self.student_form.entered_data['blob_of_json'])
            context.update(responses)
            self.student_form.save(store_pdf=True, extra_context=context)
            _check_ic_receipt(self.csr, self.student_form, cleared=False)

        if forms['questions'] is None:
            forms['questions'] = ICTripLog(
                initial=self.student_form.entered_data)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppResumeView(BaseStudentFormView):
    def get(self, request):
        forms = {'questions': None}
        if forms['questions'] is None:
            forms['questions'] = ICResume(
                initial=self.student_form.entered_data)

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        forms = {'questions': None}
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        all_valid = True

        forms['questions'] = ICResume(
            data=request.POST, required=forms_required)
        all_valid = all_valid and forms['questions'].is_valid()
        if all_valid and submission_type in self.SAVE_STATES:
            self.student_form.entered_data = forms['questions'].cleaned_data
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED
            context = {
                'timestamp': datetime.datetime.now(),
                'app_id': str(self.csr.application.id),
            }
            responses = json.loads(
                self.student_form.entered_data['blob_of_json'])
            context.update(responses)
            self.student_form.save(store_pdf=True, extra_context=context)
            _check_ic_receipt(self.csr, self.student_form, cleared=False)

        if forms['questions'] is None:
            forms['questions'] = ICResume(
                initial=self.student_form.entered_data)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppRiverLogView(BaseStudentFormView):
    def get(self, request):
        forms = [ICRiverLogForm()]

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = 'final_submission'

        forms = [ICRiverLogForm(request.POST, request.FILES)]
        all_valid = forms[0].is_valid()
        if all_valid:
            data = forms[0].cleaned_data
            # Put something reasonable in entered_data.
            #
            # We don't need to save and restore intermediate form responses, but there are
            # still a couple reasons why entered_data matters:
            # 1. If they answer "No", then we need to have a pdf for nexus saying so. For
            #    forms that don't provide their own pdf template, save() will use _pprint()
            #    to make one from entered_data. That's what's going on here. However, there's
            #    code which tries to serialize entered_data as json, but it's not smart
            #    enough to do something reasonable with file objects. That's why we can't
            #    just assign cleaned_data to entered_data like some of the other forms do.
            #    This seems to be the first form which uses _pprint() in combination with a
            #    file upload, so the file+json difficulty apparently never came up before.
            # 2. It's often useful to check on the StudentForm section of the /admin control
            #    panel when researching help desk tickets from Admissions. Having something
            #    sensible in entered_data may help with with that stuff.
            #
            # Note that normally entered_data's dictionary keys would need to match the name
            # of form fields. However, in this case it doesn't matter. We just need something
            # that's easy for humans to make sense of.
            self.student_form.entered_data = {
                'Wants to be considered for RIC': data['wants_river'],
                'File': data['river_log_file'].name if data['river_log_file'] else None
            }
            self.student_form.status = StudentForm.CLEARED
            if data['river_log_file']:
                # Making it this far means we've validated that this is a good pdf file, so
                # just save it. There's no need to mess with _files_to_pdf() because this
                # form intentionally doesn't want to accept scans or photographs.
                self.student_form.store_uploaded_data(
                    forms[0].cleaned_data['river_log_file'])
                # "Yes"+file: Don't let save() overwrite the applicant's pdf that we just stashed
                self.student_form.save(store_pdf=False)
            else:
                # "No": Make sure that save() creates a pdf for us using entered_data
                self.student_form.save(store_pdf=True)
            _check_ic_receipt(self.csr, self.student_form, cleared=False)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppScholarshipView(BaseStudentFormView):
    def get(self, request):
        forms = {'questions': None}
        if forms['questions'] is None:
            forms['questions'] = ICScholarship(
                initial=self.student_form.entered_data)

        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        forms = {'questions': None}
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        all_valid = True

        forms['questions'] = ICScholarship(
            data=request.POST, required=forms_required)
        all_valid = all_valid and forms['questions'].is_valid()
        if all_valid and submission_type in self.SAVE_STATES:
            self.student_form.entered_data = forms['questions'].cleaned_data
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED
            context = {
                'timestamp': datetime.datetime.now(),
                'app_id': str(self.csr.application.id),
            }
            responses = json.loads(
                self.student_form.entered_data['blob_of_json'])
            context.update(responses)
            self.student_form.save(store_pdf=True, extra_context=context)
            _check_ic_receipt(self.csr, self.student_form, cleared=False)

        if forms['questions'] is None:
            forms['questions'] = ICScholarship(
                initial=self.student_form.entered_data)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class DenaliQuestionnaireView(BaseStudentFormView):
    def get(self, request):
        form_name = 'denali_questionnaire'
        forms = {form_name: None}
        if forms[form_name] is None:
            forms[form_name] = DenaliQuestionnaireForm(initial=self.student_form.entered_data,
                                                       prefix=form_name)
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        form_name = 'denali_questionnaire'
        forms = {form_name: None}

        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES
        all_valid = False

        log.debug(request.POST)

        forms[form_name] = DenaliQuestionnaireForm(request.POST,
                                                   prefix=form_name,
                                                   required=forms_required)
        all_valid = forms[form_name].is_valid()

        if all_valid and submission_type in self.SAVE_STATES:
            if submission_type == 'final_submission':
                self.student_form.status = StudentForm.IN_REVIEW

            log.debug(forms[form_name].cleaned_data)

            self.student_form.entered_data = \
                forms[form_name].cleaned_data
            self.student_form.save(extra_context={'denali_form': forms[form_name]},
                                   store_pdf=True)

            _check_receipt(self.csr, self.student_form)

        if forms[form_name] is None:
            forms[form_name] = DenaliQuestionnaireForm(initial=self.student_form.entered_data,
                                                       prefix=form_name)

        fragment_context = self.get_fragment_context(forms,
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )


class IcAppRefsView(BaseStudentFormView):
    def template(self):
        return 'admissions/dashboard/student_form_views/ic_app_refs.html'

    def form_template(self):
        return 'admissions/dashboard/student_form_views/ic_app_refs_form.html'

    def get(self, request):
        application = self.csr.application
        ask_ref_student_form = self.student_form
        lor_student_form_type = StudentFormType.objects.get(slug=self.lor_slug)
        lor_student_form = StudentForm.objects.get_or_create(application=application,
                                                             type=lor_student_form_type)[0]
        clear_status_if_reference_submitted(ask_ref_student_form,
                                            lor_student_form,
                                            self.lor_slug)
        ao_only = request.user.has_perm('dashboard.view_applicant_dashboard')
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'forms': {'ask_ref_form': AskReferenceForm()},
                       'student_form': ask_ref_student_form,
                       'lor_student_form': lor_student_form,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr),
                       'ao_only': ao_only,
                       'lor_form_cleared': lor_student_form.status == StudentForm.CLEARED,
                       'lor_student_form_status': self.get_human_readable_status(lor_student_form.status)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        form = AskReferenceForm(request.POST)
        ask_ref_student_form = self.student_form
        form_is_valid = form.is_valid()
        if form_is_valid:
            self.send_email(form, ask_ref_student_form)
        forms = {'ask_ref_form': form}
        fragment_context = self.get_fragment_context(forms,
                                                     not form_is_valid,
                                                     request)

        return HttpResponse(
            json.dumps({'forms_valid': form_is_valid,
                        'submission_type': submission_type,
                        'draft': ask_ref_student_form.draft,
                        'errors': form.errors,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)})
        )

    def get_human_readable_status(self, status):
        verbose_status = {
            None: 'Not started yet',
            StudentForm.DRAFT: 'In progress',
            StudentForm.CLEARED: 'Completed',
        }
        return verbose_status[status]

    def send_email(self, form, ask_ref_student_form):
        pk_encrypter = PKEncrypter()
        name = form.cleaned_data['name']
        email = form.cleaned_data['email']
        url = 'http://{site}{url}'.format(
            site=settings.NOLS_WEB_HOST,
            url=reverse(
                'dashboard:fill_reference',
                kwargs={
                    'encrypted_student_form_pk': pk_encrypter.encrypt(ask_ref_student_form.pk),
                    'encrypted_email': pk_encrypter.encrypt_string(email)
                }
            )
        )
        global_merge_vars = {
            'APPLICANT_NAME': ask_ref_student_form.application.person.entity.name.full_name,
            'REFERRER_NAME': name,
            'URL': url
        }

        result = send_email_util(TEMPLATE.IC_APP_REFERENCE,
                                 recipients=[email],
                                 global_merge_vars=global_merge_vars,
                                 nols_person=ask_ref_student_form.application.person)

        # Stash the link, recipient info, and delivery info
        ask_ref_student_form.entered_data.update({
            'url': url,
            'name': name,
            'email': email,
            'result': result,
            'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
            'lor_slug': self.lor_slug
        })
        ask_ref_student_form.save(store_pdf=False)


class IcAppRef1View(IcAppRefsView):
    lor_slug = 'ic_app_lor_1'
    reference_slug = 'ic_app_ref_1'

class IcAppRef2View(IcAppRefsView):
    reference_slug = 'ic_app_ref_2'
    lor_slug = 'ic_app_lor_2'

class IcAppRef3View(IcAppRefsView):
    reference_slug = 'ic_app_ref_3'
    lor_slug = 'ic_app_lor_3'

class IcAppLetterOfRecommendationView(BaseStudentFormView):
    def template(self):
        return 'admissions/dashboard/student_form_views/ic_app_lor.html'

    def form_template(self):
        return 'admissions/dashboard/student_form_views/ic_app_lor_form.html'

    def get(self, request):
        form = LetterOfRecommendationForm(
            initial=self.student_form.entered_data)
        forms = {'recommendation': form}
        return render(request,
                      self.template(),
                      {'csr': self.csr,
                       'student_form': self.student_form,
                       'forms': forms,
                       'ao': AdmissionsOfficer.get_for_csr(self.csr)})

    def post(self, request):
        submission_type = self.get_submission_type(request)
        forms_required = submission_type in self.VALIDATION_STATES

        form = LetterOfRecommendationForm(
            data=request.POST, required=forms_required)
        all_valid = form.is_valid()

        if all_valid and submission_type in self.SAVE_STATES:
            self.student_form.entered_data.update(form.cleaned_data)
            if self.student_form.draft and submission_type == 'final_submission':
                self.student_form.status = StudentForm.CLEARED
            context = {
                'timestamp': datetime.datetime.now(),
                'app_id': str(self.csr.application.id),
            }
            # Make entered_data available in the top level namespace
            context.update(self.student_form.entered_data)
            self.student_form.save(store_pdf=True, extra_context=context)
            _check_ic_receipt(self.csr, self.student_form)
            application = self.csr.application
            ask_ref_student_form = StudentForm.objects.get(application=application,
                                                           type__slug=self.reference_slug)
            clear_status_if_reference_submitted(ask_ref_student_form,
                                                self.student_form,
                                                self.reference_slug)


        fragment_context = self.get_fragment_context({'recommendation': form},
                                                     not all_valid,
                                                     request)
        return HttpResponse(
            json.dumps({'forms_valid': all_valid,
                        'submission_type': submission_type,
                        'draft': self.student_form.draft,
                        'form_body': self.re_render_forms(fragment_context, request),
                        'progress': self.csr.percent_ready,
                        'generic_modals': self.generate_modals(fragment_context, request)
                        })
        )

class IcAppLor1View(IcAppLetterOfRecommendationView):
    lor_slug = 'ic_app_lor_1'
    reference_slug = 'ic_app_ref_1'

class IcAppLor2View(IcAppLetterOfRecommendationView):
    lor_slug = 'ic_app_lor_2'
    reference_slug = 'ic_app_ref_2'


class IcAppLor3View(IcAppLetterOfRecommendationView):
    lor_slug = 'ic_app_lor_3'
    reference_slug = 'ic_app_ref_3'


def instantiate_view_from_slug(slug, student_form, csr, request):
    view_name = slug.title().replace('_', '') + 'View'
    return globals()[view_name].as_view(csr=csr, student_form=student_form)(request)
