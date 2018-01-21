I arrived at ten today and worked a solid 8 hours until 6:30 with about a half hour of break time.

#### What I've Worked On:
- Finished up giving process changes that Suresh asked for:
  - Fixed a bug in my local environment. The GUI test was trying to click on an element in the Django Debug Toolbar. I had changed around some of the tests trying to fix this yesterday and resolved it today.
  - Fixed some small layout problems, such as not having text inside the back button on Authorize.html.
  - I put some thought in to whether we should include a payment description, and decided to re-add it after taking it out in an earlier commit.
  - I tested to make sure the payment back buttons that I did work on yesterday went to the right places.
  - I ran all the tests one more time to make sure they were ready to go.
- Started the process of adding a way to check if an instructor is applying for wilderness medicine work for the season in which they are submitting their WRAP (applying_for_wild_med_work).
  - Added the necessary field in the model.
  - Updated the forms so that it displays on the WRAP.
  - Began the process of only showing the field if the instructor has the ability to work for wilderness medicine.
    - Found out how to get the necessary info:
      - `nick = api.people(10176827).get()`
      - `cls = nick.classifications.get()`
      - `for c in cls: print c.type`
    - Currently figuring out how to put the NOLS Api dependency in to our project
      - Looked at DataAccess, in the settings files, and a few other random places
      - Looked in Two Scoops of Django to try to figure out what seemed like the most logical place
      - It's 5:45 and I have about 45 minutes left
