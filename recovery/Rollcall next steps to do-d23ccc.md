- [x] See if you can remove some more duplicated javascript from base.html (ie. citizenship stuff)
- [x] Test out base.html javascript
- [x] Do you want to re-add the `setTimeout` thingy on dataentry.js? (No)
- [x] Merge in 3109 and see if what you came up with there is a good solution to the horrendous authenticated_form page (I resolved this a different way)
- [ ] Reduce/cleanup the gross form_modal includes if you can
  - [ ] look in to adding context in the views
- [x] Test out/remove javascript on dataentry_form
- [x] Make sure the how did you find out about this course is re-added (it already was... just missed it)

Welcome Back!

So this is not in a terrible state. But you will need to brush up here a little bit.

Basically, a big part of the work is in a decent (PR-able) state. Ideally, we would reduce the context variables that make a horrible mess in the templates by adding context in to the views. For example:

template.html:

{# this is shitty: #}

{% with "auth_form" as form_id %}\
  {% with auth_form as form %}\
      {% url "login"  as form_action %}\
      {% url "get_started"  event.wmi_course_id as redirect %}\
      {% with "next" as redirect_name %}\
      {% with "Login" as modal_title %}\
          {% include "dataentry/fragments/login_modal.html" %}\
      {% endwith %}\
      {% endwith %}\
  {% endwith %}\
{% endwith %}\

{# ah, much better: #}\
{% with auth_form as form %}\
    {% url "get_started"  event.wmi_course_id as redirect %}\
      {% include "dataentry/fragments/login_modal.html" %}\
{% endwith %}

You can achieve this by getting adding context in the view. Currently I'm trying to refactor core/utils_dataentry.py to do this.

This is currently at the end of core/utils_dataentry.py:\
def build_auth_form(request=None):\
    return {\
            "form": AuthenticationForm(request=request),\
            "title": "Login",\
            "form_id": "auth_form",\
            "redirect_name": "next",\
            "form_action": reverse("login")\
            }
