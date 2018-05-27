import datetime

from django.db import models
from django.db.models import Q
from django.conf import settings
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from staffing import constants as const
from core.constants import ALUMNI
from core.nmc import da
from core.models import ApplicationValueTab, CertificationTab, NolsPerson, User, PersonNameTab,\
    EmailTab
from website.multi_select import MultiSelectField
from website.csv_unicode import UnicodeWriter
from website.validators.validate_filename import validate_filename


class SeasonManager(models.Manager):
    """Custom manager to support selecting seasons"""

    def get_current_season(self):
        """Return current season based on wrap open date and current date"""
        today = datetime.date.today()
        try:
            season = self.get(wraps_open__lte=today, contracts_offered__gte=today)
        except Season.DoesNotExist:
            season = None

        return season

    def get_next_season(self):
        """Return next season based on wrap open date and current date"""
        today = datetime.date.today()
        try:
            seasons = self.filter(wraps_open__gt=today).order_by('wraps_open')
            season = seasons[0] if seasons else None
        except Season.DoesNotExist:
            season = None
        return season

    def get_most_recent_summer(self):
        """Return the most recent summer season,

        The original purpose of this method is to give the most recent summer season so we can
        report who worked in the previous peak season. Staff that work peak season are given
        priority for off-season work. It should be noted that since Winter/Spring wraps start
        during the last weeks of summer we have to be careful with finding the most recent summer.
        Using operations_start seems okay for now, but the future could prove otherwise.
        """

        # Let the DoesNotExist propagate if we don't find one. That is a problem.
        today = datetime.date.today()
        two_years_back = datetime.date(today.year-2, 5, 1)
        summers = Season.objects.filter(season='Summer', operations_start__gt=two_years_back,
                                        operations_start__lt=today).order_by('-operations_start')
        if summers:
            return summers[0]


class Season(models.Model):
    """NOLS operational season: Fall, Winter/Spring, Summer """

    season = models.CharField(max_length=20, choices=const.SEASON_CHOICES)
    wraps_open = models.DateField()
    wraps_close = models.DateField()
    contracts_offered = models.DateField()
    responses_due = models.DateField()
    operations_start = models.DateField()
    operations_end = models.DateField()
    messages = models.TextField(blank=False, null=False, default=const.DEFAULT_SEASON_MESSAGE)

    objects = SeasonManager()

    class Meta:
        ordering = ('-operations_start',)

    def __unicode__(self):
        return "%s " % self.name

    def __repr__(self):
        return u'<%s: %s>' % (self.__class__.__name__, unicode(self))

    @property
    def max_workable_weeks(self):
        """Theoretical maximum of weeks available as a rounded into, ignores course mix"""
        #delta = self.operations_end - self.operations_start
        #return int((delta.days / 7.0) + 1)
        # Per staffing, use 10 ... using the max gives unrealistic impression that we could actually
        # give someone this many weeks
        return 10

    @property
    def name(self):
        return '%s %s' % (self.season, self.operations_end.year)


CERTIFICATION_CHOICES = Q(
    Q(grouping='Certification') &
    ~Q(value__in=const.NONSKILL_CERTS) &
    ~Q(description='separator')
)


class StaffingQuery(models.Model):
    """Empower staffing coordinators to do their own staffing queries"""
    name = models.CharField(max_length=30, help_text="Something descriptive to help you find this"
                            " query in the future.", validators=[validate_filename])
    gender = MultiSelectField(
        choices=(('F', 'Female'), ('M', 'Male'), ('U', 'Unknown')),
        max_length=5,
        help_text="This field is called 'sex' in the database, we usually call in 'gender' on the "
                  "website. Who knows what NOLS thinks it is storing in this field. And don't "
                  "get me started by suggesting that 'sex' would be a better label than 'gender' "
                  "because neither is a binary choice.",
        default='F,M,U'
    )
    desired_certifications = models.ManyToManyField(ApplicationValueTab,
                                                    limit_choices_to=CERTIFICATION_CHOICES)
    worked_since = models.DateField(
        help_text="The query will return qualified instructors who have worked since this date."
        " This defaults to two years ago (i.e. current instructors).")
    positions = MultiSelectField(max_length=40, choices=const.POSITION_CHOICES,
                                 default='Course Leader,Patrol Leader,Instructor')
    creation_ts = models.DateTimeField('created', auto_created=True)
    created_by = models.ForeignKey(User, null=True, related_name='creator')
    modified_ts = models.DateTimeField('modified', auto_now=True)
    modified_by = models.ForeignKey(User, null=True, related_name='modifier')

    class Meta:
        verbose_name_plural = 'staffing queries'

    @property
    def certifications(self):
        return [v['value'] for v in self.desired_certifications.all().values('value')]

    def csv_link(self):
        # TODO: Is there a better way to check if we are in Add state?
        if not self.creation_ts:
            return ''
        url = reverse('admin:download_staffingquery_csv', args=[self.pk])
        return format_html('<a href="{0}">Download results in a CSV file</a>', url)

    csv_link.short_description = 'CSV'

    def download_csv(self):
        """
        Create a CSV file with the results of the staffing query. Include a column for:
        personid,
        name,
        relevant certifications (i.e. the ones that meet the parameters of the query)
        active email addresses
        """
        response = HttpResponse(content_type='text/csv')
        filename = 'StaffQuery-%s_%s.csv' % (self.creation_ts.strftime('%Y%m%d'), self.name)
        response['Content-Disposition'] = 'attachment; filename="%s"' % filename

        staff_list = self.get_staff()

        # Order the following two querysets in the same order in order to avoid nested for loops
        # while writing to the csv file. This way we only have to traverse each list once.
        name_list = PersonNameTab.objects.filter(person__in=staff_list, active='Y')\
            .order_by('person__person_id').select_related('person')

        cert_list = CertificationTab.objects.filter(person__in=staff_list,
                                                    certification__in=self.certifications) \
            .order_by('person__person_id').select_related('person')

        email_list = EmailTab.objects.filter(person__in=staff_list, status='Current')\
            .order_by('person__person_id').select_related('person')

        num_certs = len(cert_list)
        num_emails = len(email_list)

        cert_counter = 0
        email_counter = 0

        writer = UnicodeWriter(response)
        writer.writerow(['Person Id', 'Name', 'Gender', 'Emails', 'Certifications'])
        for name in name_list:
            person_certs = []
            while cert_counter < num_certs and name.person == cert_list[cert_counter].person:
                person_certs.append(cert_list[cert_counter])
                cert_counter += 1

            person_emails = []
            while email_counter < num_emails and name.person == email_list[email_counter].person:
                person_emails.append(email_list[email_counter])
                email_counter += 1

            writer.writerow([
                unicode(name.person.person_id),
                name.short_name,
                name.person.sex,
                ', '.join(email.email for email in person_emails),
                '; '.join([cert.__unicode__() for cert in person_certs]),
            ])

        return response

    def get_staff(self):
        certified_staff = NolsPerson.objects.filter(
            certificationtab__certification__in=self.certifications,
            contracttab__start_date__gte=self.worked_since,
            contracttab__status='Completed',
            certificationtab__position__in=self.positions,
            sex__in=self.gender)
        return certified_staff.distinct()

    def staff_count(self):
        return self.get_staff().count()
    staff_count.short_description = 'Count'

    def staff_list(self):
        name_list = PersonNameTab.objects.filter(person__in=self.get_staff(), active='Y') \
            .order_by('last').select_related()
        output = [u'<ul>']
        for name in name_list:
            output.append(format_html(u'<li><a href="http://{0}/nexus/#people/{1}" '
                                      u'target="_blank">{2}</a></li>',
                                      settings.NEXUS_SERVER,
                                      name.person.person_id, name.short_name))
        output.append(u'</ul>')
        return mark_safe(u''.join(output))
    staff_list.short_description = 'Qualified Instructors'

    def __unicode__(self):
        return u'%s (%s)' % (self.name, self.modified_ts.strftime('%m/%d/%Y'))


class Wrap(models.Model):
    """Work Request & Plan. That is, instructors asking for work (Dream Sheet) back in the day."""

    season = models.ForeignKey(Season)
    user = models.ForeignKey(settings.AUTH_USER_MODEL)
    is_avail_all_season = models.NullBooleanField()
    blackout_date_details = models.CharField(
        'Dates you can NOT work', max_length=300, blank=True, null=True)
    minimum_weeks = models.IntegerField()
    maximum_weeks = models.IntegerField()
    will_proctor = models.NullBooleanField('Consider me for proctor')
    proctor_branch_prefs = models.CharField(
        max_length=60, null=True, blank=True,
        help_text="Notify the branch as well. Limit to two.")
    will_nolspro = models.NullBooleanField('Interested in Custom Education work?')
    pro_branch_prefs = models.CharField(
        "Custom Ed work prefs",
        max_length=60, null=True, blank=True,
        help_text="Specific course/client requests, limit three.")
    applying_for_wild_med_work = models.NullBooleanField(
        'Are you applying to work as a Wilderness Medicine instructor this season as well?')
    co_instructor_prefs = models.CharField(
        'Co-instructor prefs', max_length=150, blank=True,
        null=True, help_text='People you would like work with. Limit to three.')
    priorities = models.CharField(
        max_length=300, null=True, blank=True,
        help_text='Using the information above, please summarize your priorities.')
    will_work_anywhere = models.NullBooleanField(
        'Will work as needed',
        help_text="Will you work if we cannot accommodate your priorities?")
    submitted_ts = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = (('season', 'user'),)

    def __unicode__(self):
        return " %s for %s " % (self.name, self.season.name)

    def __repr__(self):
        return u'<%s: %s>' % (self.__class__.__name__, unicode(self))

    @property
    def name(self):
        if self.user.nols_person is not None:
            name = self.user.entity.name.format('NL')
        else:
            name = 'No Instructor attached'

        return '%s: %s wks' % (name, self.weeks_range)

    @property
    def weeks_range(self):
        min_weeks = '' if self.minimum_weeks is None else self.minimum_weeks
        max_weeks = '' if self.maximum_weeks is None else self.maximum_weeks
        return '%s-%s' % (min_weeks, max_weeks)

    @property
    def summary(self):
        """Text summary of the wrap, used in event log, confirmation email, etc"""

        person_name = self.user.entity.name.format('NL') if self.user else ""
        season_name = self.season.name if self.season else "Unknown"

        course_prefs = WrapCourseSelection.objects.filter(wrap=self).order_by('preference')
        # Get ops location display names with one database hit
        courses_txt = ''
        for pref in course_prefs:
            courses_txt += """
Choice %(pref)s: %(position)s-%(loc)s-%(course_type)s
Note: %(notes)s """ % dict(
                pref=pref.preference,
                position=pref.position,
                loc=pref.ops_location,
                course_type=pref.course_type,
                notes=pref.notes)

        data = {
            'person_name': person_name,
            'season_name': season_name,
            'courses_txt': courses_txt,
            'min_weeks': self.minimum_weeks,
            'max_weeks': self.maximum_weeks,
            'proctor': 'Yes' if self.will_proctor else 'No',
            'nolspro': 'Yes' if self.will_nolspro else 'No',
            'proctor_branch_prefs': self.proctor_branch_prefs if self.will_proctor else 'None',
            'pro_branch_prefs': self.pro_branch_prefs if self.will_nolspro else 'None',
            'work_as_needed': 'Yes' if self.will_work_anywhere else 'No',
            'co_instructor_prefs': self.co_instructor_prefs or 'None',
            'priorities': self.priorities or 'None',
            'submitted_ts': self.submitted_ts.strftime(const.FMT),
            'is_avail_all_season': 'IS' if self.is_avail_all_season else 'IS NOT',
            'blackout_detail': '\rBlackout details: %s' % self.blackout_date_details
            if not self.is_avail_all_season else ''
        }

        txt = """Wrap for %(person_name)s <--> %(season_name)s season

Submitted: %(submitted_ts)s

Weeks wanted: %(min_weeks)s - %(max_weeks)s
%(is_avail_all_season)s available all season %(blackout_detail)s

%(courses_txt)s

Will proctor: %(proctor)s  Details: %(proctor_branch_prefs)s

Interested in NOLSPro: %(nolspro)s  Details: %(pro_branch_prefs)s

Co-instructor prefs: %(co_instructor_prefs)s

Will work as needed: %(work_as_needed)s

Priorities: %(priorities)s
""" % data

        return txt


class WrapCourseSelection(models.Model):
    """A collection of attributes that an instructor prefers for the work request"""

    wrap = models.ForeignKey(Wrap)
    preference = models.IntegerField()
    position = models.CharField(max_length=20, choices=const.POSITION_CHOICES)
    ops_location_code = models.CharField('Location', max_length=4, choices=const.LOCATION_CHOICES)
    course_type = models.CharField(max_length=50, choices=const.SKILLS_CHOICES)
    notes = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['preference']

    def __unicode__(self):
        details = '-'.join(filter(None, (self.position, self.ops_location, self.course_type)))
        pref = self.preference or ''
        return "Choice %s: %s" % (pref, details)

    @property
    def ops_location(self):
        "Return full operations location text (i.e. not the internal, three-letter code"
        if self.ops_location_code == ALUMNI.sponsor_code:
            return 'Alumni'
        ops_locations = da.course.get_ops_locations()
        ops_location_map = dict((loc.code, loc.name) for loc in ops_locations)
        return ops_location_map[self.ops_location_code]

    def __repr__(self):
        return u'<%s: %s>' % (self.__class__.__name__, unicode(self))
