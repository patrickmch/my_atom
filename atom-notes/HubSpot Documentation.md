# HubSpot
NOLS uses [HubSpot](https://www.hubspot.com/) to collect information about prospective students. You can navigate to [info.nols.edu](info.nols.edu) to see the main landing page.
You'll notice that info.nols.edu looks similar to the NOLS website. This presents challenges because info.nols.edu is hosted on HubSpot's servers, over which we have minimal control. Yet, we need to maintain the look and feel of the NOLS website on these pages. Fortunately, Creative does most of the work to make it look pretty. Every once in a while, however, we have to get involved.
## Editing Files (FTP or GUI)
The standard way to edit files etc. on HubSpot is via a GUI, but you can connect to HubSpot's servers via FTP. You will almost certainly find this easier and more straightforward than trying to navigate through the HubSpot GUI. I found [the instructions](https://designers.hubspot.com/docs/tools/hubspot-ftp) fairly easy to follow.
Unfortunately, I found no way to edit HTML files via FTP. You'll probably need to use the GUI :p
**N.B.** HubSpot uses a CDN. This means that sometimes file changes take a bit of time to propagate accross the network, and means that your changes may take a while to see.
## Styles
The majority of the info.nols.edu styles accessed by pulling `screen.css` from nols.edu servers. A few custom stylesheets exist and (as of April 2018) can be confusing and a bit messy. The two stylesheets that you will likely want to find are `NOLS-theme-style.css` and `typography.css`, located under `portals/548959-national_outdoor_leadership_school/content/templates/custom/page/NOLS_Theme_-_2016`.
## Navigation
One of the main tasks you might need to do will involve updating the HubSpot's navigation so that it looks like the one on nols.edu.
- In your local environment run `make all` on the most recent version of `develop` to make sure that you have the most recent build.
- Copy the contents of `~/code/website/nols_website/website/templates/fragments/navigation.html`
- In the HubSpot GUI, click Content->Design Manager->Global Content(left side)->NOLS Navigation code
- Replace this content (ie. the old navigation HTML) with the contents of `navigation.html` and click 'Publish'
- Make sure to add `https://nols.edu` to any links and images otherwise they will be broken
## Fonts
- If you've changed the fonts on nols.edu via Typography.com, you'll need to copy the `<link />` HTML provided by Typography.com to the `<head>` by navigating to 'Content Settings' and scrolling down.
- Fonts aside from the Sentinel family (ex. Pressura) live on HubSpot's servers. If you're not using Typography.com fonts, you'll need to upload any new fonts to HubSpot.
