# Master TODO List


Other:
- [ ] Figure out what percentage of non-null blackout dates are in the WRAPS
- [x] Delete abandoned branches from GitHub
- [ ] Version control api_csv_script (without test passwords)

See [1-15-2018 Notes](./1-15-2018.md)
- [ ] Get in touch with Cristina about the imports
  - [x] Make sure that she checks off that it is correct in Nexus
  - [x] Ask Steve for the password that he set for her in nexusclone
  - [x] The link is http://nexusclone.nols.edu/nexus/#people/10622203
  - [ ] Import the file in to production
  - [ ] Confirm that it's in production
- [ ] Write a basic command line interface for the imports
  - [ ] You can look in the scripts files to get some ideas
  - [ ] Should have a username/password interface
  - [ ] See if you can use Python3 (probably won't require changes, just make sure it's using py3)
- [ ] Find other Python2 dependencies and just keep track of what they are


See [1-16-2018 Notes](./1-16-2018.md)
Wrap is_applying_for_wild_med_work Addition
- [ ] Add in a field to check if the instructor is a WildMed instructor who is also applying for WildMed work
  - [x] Make sure I can test WRAPS
  - [x] Add field and update model
    - [ ] Show staffing draft and get the verbage right
  - [x] Use API to query the db and see if they are a WildMed instructor
    - [x] Add a dependency to NOLS API Client (steve says we stop and think before adding a dependency)
    - [x] If we query anything that is not on SPEs or Person talk to Steve
  - [x] Show field if they are WildMed instructor
  - [ ] Add field to script that will dump all the WRAP data (it will export the WRAP data to CSV for staffing)
    - [ ] There is a readme in the Staffing module of the website that details how to use the export script. The actual script lives in staffing.utils.export_current_season_wraps_to_file
  - [ ] Add tests for this?
- [ ] Add tests for WRAPS in general

- [ ] Refactor SPEs to use API rather than DA
  - [ ] Only display evals for a type of 'course'
    - [ ] display when course_id is not null or some such 
  - [x] Make sure you figure out when an SPE 'is_viewable'
  - [ ] Take hardcoded id out and replace it with entity_id
- [ ] Add Facebook Metadata to the Donation page #2718
