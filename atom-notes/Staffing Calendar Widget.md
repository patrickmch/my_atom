# WRAP Blackout Date Options

The blackout date submission stuff needs an overhaul. Currently, it involves submitting the dates in a TextField.

The [ticket on GitHub][14c024d0] states: _Blackout dates should be driven by a sophisticated calendar widget that will allow instructors to visually select ranges of dates they are unavailable. Once _ (sic) _idea is a calendar widget that allows instructors to X out particular days. Another idea, probably simpler to implement, is to provide an unlimited set of start- and end-dates that define blackout ranges._

## Infinite Range of Dates

It would need:
- A "from" and "to" input for specifying a range of dates
- The ability to add more of these date ranges (say by clicking a "+")

The implementation will likely entail:
- Creating a custom Django widget
- Some JavaScript that creates new form fields
- A small, JQuery UI like selection calendar
  - Submitting the data as a list 

## Calendar

It would need:
- A basic blackout date event type
- A way to create multiple blackout dates, including ranges of dates
- To only show the dates of the WRAP season that the instructor is applying for
- To submit this data as a list of dates along with the WRAP form
- Potentially a way to go back to the old style of submitting dates in a TextField if this implementation contains bugs

The implementation will likely entail:
- Creating a custom widget in Django
- Using [fullcalendar][cf52e38d] on the front end to render the calendar
- Filling a hidden input with the date ranges from fullcalendar
- Submitting the hidden input along with the other form data
- Researching the data compatibility between the current implementation and this one (ie. CharField vs. Date or some such)

[cf52e38d]: https://fullcalendar.io "fullcalendar"
[14c024d0]: https://github.com/NationalOutdoorLeadershipSchool/website/issues/125 "ticket"
