Welcome Back!

So the rollcall project is not in a terrible state. But you will need to brush up here a little bit.
This is the spec: https://docs.google.com/document/d/1YuRm9oXDiRfQsOS_bjfTbnceY589E-rqymXUOCS1kiA/edit?pli=1#heading=h.g4bt55icdp8q

Basically, a big part of the work is in a decent (PR-able) state. Ideally, we would reduce the context variables that make a horrible mess in the templates by adding context in to the views. I've started this with two WIP commits that you can ditch but are probably worth keeping. For example:

template.html:

{# this is shitty: #}\
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
{% endwith % can achieve this by getting adding context in the view. Currently I'm trying to refactor core/utils_dataentry.py to do this.

This is currently at the end of core/utils_dataentry.py:\
def build_auth_form(request=None):\
    return {\
            "form": AuthenticationForm(request=request),\
            "title": "Login",\
            "form_id": "auth_form",\
            "redirect_name": "next",\
            "form_action": reverse("login")\
            }

**UPDATE**: I've made some headway with this that's a little different than the above. It's in the last two WIP commits if you run a git log. (Look at utils_dataentry.py and find build_form_context(). See it called above in build_initial_form()).

Beyond this, the rollcall-account-info-page branch also needs some work. The templates/dataentry/authenticated_form.html file is quite a mess. I've refactored the page somewhat, but make sure that (again) all those damn context variables get factored in to the view. I'd also (obviously) cross-reference what's there with what's on the site right now.

The rollcall-next-steps and rollcall-account-info-page branches are different. I'd rebase rollcall-account-info-page against develop after next-steps has been merged in to develop. Not a huge deal, but might prevent merge conflicts and git hell.

Finally, a few commands that recently changed that are great:

In Atom:
space g d a (git diff all: this will diff all the changes since your last commit)
space g d d (git diff current file)
semicolon space (escape)
semicolon s (save and then escape)
shift-space (same as cmd-alt)

And on the cli:
git difftool \<branch-or-commit\> \<other branch-or-commit\> (hit :qa to quit both vim tabs at once and move to the next file)
git rebase -i \<branch-or-commit\> \<other branch-or-commit\> (hit w)

Finally, don't forget to pull and then rebase the develop branch before you do any PRs or really anything.
