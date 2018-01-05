9/18/2017
Ideas for better wraps:
-dropdown for branch prefs for proctoring/custom ed
-NOLS pro in error message:
￼
-can submit wrap with areas I’m not ready to work yet (course lead mountaineering, for example)
	+this would require us refactoring the current code quite a bit. right now there is a comment in utils.py/get_skills_for_branch_season that says we would like to store the skills in the database. For now the skills are stored as constants.
-tried to change the jquery mess where one <script> is rendered multiple times on the page.
	+currently tough because you can’t add classes to this form very easily as it is set up (requires using the widgets class which is not in use in the CourseSelectionForm class)
	+refactoring to use the <script> only once would need another css class because we need to use a specific <select> element and, when it changes, modify the values of another specific select element


9/19/2017
-After doing some processing this morning from yesterday, I think I understand Django a bit better. It seems like the views.py file is the controller, anything in the templates file is the view, and the model is obviously the models.py file.
-I looked in to a bug fix that Steve put on GitHub (Fix #2628 Allow for missing WildMed course.). This brought me in to wmi code- specifically the course_pre_charge_check() function in wmi/utils.py. Ultimately, the boolean return value of this function is passed (in a dictionary) to a payment module via views.py/apply(). The boolean is stored in a session dict in a payments/utils/payment_redirect(). It’s not clear to me what happens to it after the redirect- it either goes to an authorize page or a summary page, but it’s not obvious what happens after that. Possibly it’s just stored in the db.


9/20/2017
I’m looking in to fixtures in django. A good explanation can be found here: https://docs.djangoproject.com/en/1.11/howto/initial-data/#automatically-loading-initial-data-fixtures. When running tests, we get a deprecation warning: “x/Users/mchey/code/virtualenvs/website/lib/python2.7/site-packages/django/core/management/commands/loaddata.py:239: RemovedInDjango19Warning: initial_data fixtures are deprecated. Use data migrations instead.”
Fixtures are sets of data written in JSON (or whatever) that populate data in the db. Historically, they were commonly used to put initial data in the database upon running a migration. This is no longer supported and was removed in Django 1.9 (we’re still on 1.8).
As of v 1.11, fixtures can be used for tests because Django does not run them during a migration (https://docs.djangoproject.com/en/1.11/topics/testing/tools/#topics-testing-fixtures). This makes me think that we are running fixtures not just for tests but for all migrations- otherwise we would not be getting that warning.
Another deprecation warning: /Users/mchey/code/website/nols_website/staffing/admin.py:105: RemovedInDjango19Warning: ModelAdmin.declared_fieldsets is deprecated and will be removed in Django 1.9. I found two functions that use declared_fields in staffing and payments (admin.py/get_fieldsets()) but it’s not clear that either of those functions is actually driving anything as I searched the project and couldn’t find anywhere where they are being used.

9/21/2017
While trying to figure out the second deprecation warning from yesterday, I came across a NoReverseMatch error in the localhost environment when trying to go to /portal/admin/staffing/staffingquery/add/. Looking in to the code, the error seems to stem from the get_urls method in staffing/admin.py.
UPDATE: just refreshed and the error went away. I had put an unknown field as an experiment in the code I was trying to figure out. It’s fixed now, but I think I have a better understanding of super. My understanding is that it is primarily a means to not repeat code when subclassing. Further, (and pertinent to the situation which I found), it allows “multiple base classes [to] implement the same method” (from the docs). So this code
def get_urls(self):
        urls = super(StaffingQueryAdmin, self).get_urls()
Is just customizing a method from the base StaffingQueryAdmin class.

9/25/2017
Trying to work and listen to Tyrex. Going great. Great album.
Today I’m looking in to how we’re handling GUI tests. The main thing that I’ve been taking away from this is that we want to use page objects to run GUI tests. It seems like they simply provide a layer of abstraction from the HTML etc. When you make changes to the HTML or JS or whatever you don’t have to go in and change your tests as much.

9/26/2017
I’ve been starting to use pycharm for most things python. Some things atom is way better for but for Python development, pycharm obviously comes out on top.
I’m setting up tests for Steve’s donation pages while he’s in Africa. Problem is, he was a bit short on specifics as to what exactly I should test for. First one he said was to make some tests as an authenticated user, but I fail to see what the difference between the two processes would be… I’m going to do my best on this, but it honestly doesn’t seem that necessary. First, I’m going to look at some of the code/the website for the donations and see if there are any differences for an authenticated user. Then, I’m going to use his TestGivingUnauthenticated class as a base for mine and see what happens.
The only thing that I’m noticing is that there is a button to click (‘go to your account’) if you are an authenticated user that appears on the success page. Might be the hardest thing about this is how to get the user to be logged in in the test!

9/27/2017
So the testing has been harder than I thought. The tests themselves are not hard, but there is one thing that seems like it should change on the payment page, so I’m tracing the yarn string through the ball, as it were, to try and fix it. The problem is that there is no button to click to go back and finish donating if you go and add your billing address to your account. So if I add my billing address, I’ll end up having to fill another part of the form out again in order to donate. Things I’ve tried so far:
1) Adding a button back on the page (so far can’t find the ‘hook’ that would do this for me)
2) Looking in to the db to see how many people actually don’t even have addresses but have an account (this failed because I have no idea what I’m doing in the schema there).
 I’m going to continue trying #1 and if that doesn’t work I’ll have to consider whether the test account should just add an address on setup or whether it should go in and add later after starting the donation. Probably doesn’t matter.
Finally, I’d like to make it so we have a test account that is setup before the test starts without going through the interface. It’s automated, but silly that it goes through this process.
UPDATE: I found out where the problem is stemming from. We have a request object with when_finished as a parameter. If that’s not there than we won’t show the button to take the user back to the giving page. It seems we’re setting something called proxy_entity_id to none if that’s not in the params. (See line 212ish in core/views.py).
Yeah, so… that took me a while but I figured it out. It turns out I just have to pass a parameter when instantiating NewAddressPage. The default value of arrived_on_click is False, and I just had to set it to True. Since NewAddressPage is a child class of BasePage, there is a line that says self.get_page() that must reload the page with no parameters in the url which means that our button doesn’t load. Whew.

9/28/2017
I spent a good part of yesterday after fixing the NewAddressPage problem trying to figure out if there was a good way to nuke all the code I had copied from another class (TestGivingUnauthenticated). There is a parent class- core/test-case.py/SeleniumTestCase- that inherits from unittest.TestCase which runs a setUp method. Inside the setUp method, we instantiate a class which returns a bunch of things to config. We pass this around to various testing classes as self.config and it is necessary to run a lot of helper functions. I would like to get rid of the code that I copied from TestGivingUnauthenticated.setUp so that my code is DRY. In order to do that, I could use TestGivingUnauthenticated as my base class and then write just a couple of lines of code to modify that set up process. However, I need to run a couple of things (create user and login) BEFORE I hook in to the TestGivingUnauthenticated class. If I don’t, the testing process will be too far along (ie. it will already have filled out a donation page, when I need my user to be authenticated first).  Unfortunately, I need to get the self.config from TGU, so I have to hook in to that method earlier to do things like login. I wanted to get the config var earlier and then super TGU, but it failed (saying this now, it makes a lot of sense that I can’t do that). Things I tried:
1. Getting the var by extending SeleniumTestCase and then instantiating the TGU in TGA.setUp (this might yet work…)
2. Getting the var by using unittest.TestCase @classmethod  setupClass (totally unrelated functionality to what I’m trying to accomplish, it turns out)
3. Using some methods like tools.activate_and_connect which seemed promising initially but turned out to also require a config var.
I’ll try number one again to see if that might work but I’m not optimistic…
I figured this out. I just asked Suresh and he said I could just reorganize the classes. In retrospect this seems obvious but I didn’t want to mess with Steve’s code.

10/3/2017
I’m on to working with Django tests. Right now I’m running in to an issue where I try to submit a form to the gifts and it redirects me to an admissions application page. It may have something to do with the code I copied and pasted, but right now I can’t find what could be causing this.
UPDATE: Currently, the redirect is only happening when I’m running tests with the database. If I run them in the shell, it’s no problem. This is making me think that it’s probably some type of configuration that’s missing…
To be more specific. The url that it’s redirecting to is '/portal/admissions/open/apply/‘. It should be heading to ‘portal/payment/authorize/‘.
10/4/2017
Still unsure what could be happening.
So I’m trying to debug with ipdb (cool new tool!) starting from line 72 in create_gift_order.
I tried setting a break point (break /Users/mchey/code/virtualenvs/website/lib/python2.7/site-packages/django/db/backends/base/base.py : 173) in ipdb and am playing with objects… It’s the end of the day but this could prove to be a helpful place to start tomorrow.
10/05/2017
Ok, so. I asked Suresh and am pretty happy I did. It’s definitely a problem with the data in the testbase. We’re going to rebuild the testbase and he’s going to set me up with a local orvm. We’re waiting for lunch time to rebuild it so I’m looking in to Django CMS at the moment.
UPDATE @ 12:43
We started running the rebuild about 20 minutes ago. While it’s doing it’s thing, I’m reading up on Django CMS.
So far what I’m learning is that the CMS is designed to incorporate other application functionality. They use the example of the polling app. The polling app can be pretty simply added to a CMS project with just a few steps.
The execute() function pretty much runs all the sql, so if you need to see output this is a good place to go:
/Users/mchey/code/virtualenvs/website/lib/python2.7/site-packages/django/db/backends/oracle/base.py (Line 474)
In order to get output you can print self. param_generator(params)

10/9/2017
I’ve been working on an issue for Custom Ed and its been a bit more complex than I’d hoped. Basically, they need to show travel and passport info forms for ALL international custom ed courses. It’s hard to tell what exactly is driving this. On line 2100 of core/models I can change need_passport to True , and show the passport form. However there is a bunch more logic to wrestle with and I haven’t found out how to toggle the arrival/travel info yet at all… I’ll go ahead and try that next.
Tried setting need_passport_checkbox = True and all I got was this:

￼
Makes sense. So… still trying…
In the show_travel_info function in admissions/dashboard/student_forms_view.py line 2169, returning true causes load_saved_forms to instantiate a class that will cause the required forms to appear. Pretty confused about the way show_travel_info works though.
This self.csr object in admissions/dashboard/student_forms_view.py comes from the CourseStatusRecordTab. Csr.course however is CourseTab.
UPDATE: It looks like the only thing driving whether we show travel info or not is whether the course has a minimum age that is less than or equal to 14 per line 2171 in admissions/dashboard/student_forms_view.py. It looked that simple and I thought it couldn’t be but it is. Not sure what I should do about that. There should be a better way, obviously, but I’m not sure whether or not I should tackle it. Next thing I’m going to find out is what I can do to toggle the passport fields.

10/11/2017
It’s taken a few days to put together everything, but here is a synopsis.
The clientcoursedashboard comes from the Django Admin side of things. When we call need_passport_visa() it calls another function which checks if there is an attribute clientcoursedashboard. (This was giving me problems because there were no clientcoursedashboards enabled on my testbase account. Once I made my own settings file that imported the other settings but called the main testbase (PORTAL) account, I figured it out.) Once that happens, need_passport_visa() checks to see if there is any locations data. I just populated that field by doing a migration so that Custom Ed can put in a location.
The other thing that I need to look in to is how we display travel information for these courses. Right now (I may have mentioned this before) we display it based on the course minimum age. I’ll have to see about resolving that.
I’m running some tests to make sure that I didn’t mess anything up. In the meantime I need to think about things to test here.
-Test that dashboard shows passport info if coming from an international course for custom ed
-Test that dashboard shows passport info if coming from certain international courses


10/16/2018
I’m still trying to debug the gift tests. It looks like the url is being changed down in the stack on line 661 of /Users/mchey/code/virtualenvs/website/lib/python2.7/site-packages/django/test/client.py in handle_redirects()
UPDATE: still looking a few hours later. handle_redirects is called a lot, and there is a lot that happens between those calls. In get() line 499 in client.py the response object is also returned altered. This puts us closer to the actual alteration but not right on it.
UPDATE 1:09: I found the offending code: it’s in /Users/mchey/code/website/nols_website/payment/decorators.py on line 109. For some reason order.total amount is set to zero. Not sure why just yet.
UPDATE 2:30: I found that the problem is we’re hitting /Users/mchey/code/website/nols_website/payment/decorators.py and on line 107 redirecting to ‘open_apply’ if we don’t have an order.total_amount. Not sure why this is coming in at zero but I’m currently debugging in /Users/mchey/code/website/nols_website/alumni/views_gift.py.
Takeaway: next time you get weird redirects, just search for something like ‘reverse(‘open_apply’)’ instead of following an epic stack trace that takes hours to follow.
UPDATE 3:14: I tried converting the int to a float and got a different redirect… Going to go climb and will pick up later.

10/17/2017
The redirect I got was actually just back to that same page that we start on (validation error after I put in the float). Now I’m looking at why the order amount is coming in blank. It looks like there are two classes: Order and LineItem. They’re related through a method in Order called total_amount that’s decorated with @property. It puts all the line items in a list comp and does sum on that while calling line_total() on each line item.
I just compared the data with the data coming through the form (maybe should have done that last week). It looks like there is a csrfmiddlewaretoken that is being given out.
Ok, per this answer on stackoverflow: https://stackoverflow.com/questions/25003527/how-do-you-include-a-csrf-token-when-testing-a-post-endpoint-in-django the csrfmiddlewaretoken is not needed in Django tests.
One critical piece of code, the method line_total() on line 298 of /Users/mchey/code/website/nols_website/payment/models.py is not being called in the tests. This is because order.line_items.select_related() returns an empty list…
The question right now seems to be: why is order not not being related to line_item in the test? Maybe that begs the question: what is different about the object being created on the site vs that being created in the Django test?
UPDATE 6:07
I couldn’t figure this out for the life of me so I’m taking a stab again at home after an extended break. It occurs to me that the only difference between the two order objects is that one has a non-empty line_items.select_related()
UPDATE 7:20
Order.line_item.select_related(‘order’) works on the test. This, however, does not answer why one test fails but another does not.

10/18/2017
Ok it’s more or less solved. After figuring out last night that inserting a parameter in to select_related() would solve it, that was the fix we decided on. Basically, Steve decided this was a bug and had me change /Users/mchey/code/website/nols_website/payment/models.py line 125 to have an ‘order’ param in select_related.

10/25/2017
Steve asked me to look in to a problem with the encoding.
These are some of the articles I’ve been looking at:
https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/
https://stackoverflow.com/questions/19212306/whats-the-difference-between-ascii-and-unicode
https://stackoverflow.com/questions/16467479/normalizing-unicode
What I’ve learned is that, first, encoding is really complicated.
Beyond that, my understanding is that ASCII the oldest standard. Numbers between 32 and 127 was reserved for characters found in American English. Above 128 things were really messy because everyone tried to come up with their own standards (up to 255 because bytes have room for 8 bits).
Along came Unicode to solve this problem by encoding every language in a system. Every character is encoded in something like this U+0639.
Then they invented UTF-8 which was actually just a means of storing unicode using 1 byte up to 128 (so it really just looks like ASCII), and up to six bytes for everything past that. There are other ways of encoding unicode as well, but UTF-8 is the most common.
Ok, so just encode in UTF-8… right?
Yeah except we ran in to a problem where Oracle equates char length to bytes (ie. 1 char = 1 byte), even though that is not the case for unicode above 128. So when we tried to put some non-ASCII characters in a column with a max length of 20, we ran in to space constraints.
So we have a few options to go in to. One of them is to simply ‘normalize’ our data and convert any characters with greater than 1 bytes to ASCII. This seems like it may be the simplest option and I’m not sure what else would work.

11/27/2017
Just got back to Lander!
Steve assigned a ticket to me in GitHub. Basically when we’re getting the client IP we assume that there is only one IP in a list. This is faulty logic and causes failures when we get more than one IP in our list.
Ok so I’m researching some stuff called memcache. Right now I understand that memcache is a service that allocates server memory intelligently so that it can use the full amount of memory when multiple servers are working together in a web app. That’s bringing me to TCP. Per this stack overflow question, TCP is a protocol for sending data between IP addresses, telling the server the data actually arrived, etc. (UDP is another protocol that has only a little bit of metadata like a port number and no reliability).


11/29/2017
A few quick notes on setting up your environment:
-I still need to find a better way to manage my dot files.
-It’s worth continuing to upload atom prefs to GitHub
-If Bpython is having issues this seemed to help: $ export PYTHONSTARTUP=~/.pythonrc
-Add what virtualenv you’re in to zsh

12/1/2017
NOTES:
Using the api to post new data using a csv file (python has a csv module), next level would be generating a relationship (it could be a relationship to me) (password will be ttt user t)

select * from AUTH_USER where ID = 10607265 Anne Hayford = 10607265
39030166
Find static files and look in js for problem


12/9/2017
I’m working in JavaScript trying to debug a problem that has two of the same elements on the page rendering differently. They are in a separate tab, but should look the same. The css is different. On the element that is rendering correctly the css is position: absolute; left: 100px; top: 0px; on the one where it is wrong the css is position: absolute; left: 0px; top: 100px;
Going home. The differences are coming from the JS (which I knew). Tomorrow I’m going to look in to why the ‘textContent’ is changed in the JS when TileStageView is called.

12/10/2017
Getting close to fixing this thing after working on it for just about three days :p. The problem is fairly simple: isotope.js just needs to be loaded after a user clicks on the tabs. It just didn’t occur to me until later that the tabbed structure wasn’t playing nice with isotopes’ grid system. Right now I modified the for loop that was there before, but I still have a ways to go. I might try to do it with out jQuery if possible.


12/15/2017
Notes for templates from Emily:
-Extends bootstrap/base.html
-block content_header
Places looked for relevant Django templates: see templates_search.txt

12/16/2017
Questions re site design:
-Arrow defaults to mud: do we want it to be black? Haven’t found an example of black arrows on the site…
-Where should the ‘more ways to give’ link go to?
-try https://djangosnippets.org/snippets/863/ or  http://garmoncheg.blogspot.com/2014/05/implementing-multiple-radio-select.html
-

12/22/2017
Places custom checkboxes or radio buttons exist:
/Users/mchey/code/website/nols_website/admissions/dashboard/templates/admissions/dashboard/payment/

12/27/2017
It’s easy to forget how to include javascript resources in Django templates. Here is a reminder how:
{% block extra_head %}
{{ block.super }}
<script type="text/javascript" src="{% static 'alumni/js/alumni.js' %}"></script>
{% endblock %}

12/28/2017
Question for creative: why do we use one color for labels of checkboxes but not for reg labels?

12/29/2017
Here is the question to figure out which processes might be causing the issue with python-ide:
https://askubuntu.com/questions/314217/how-to-find-out-which-python-script-is-using-resources
