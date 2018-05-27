## A List of Steps Taken and to Take

- Recreate the issue as closely as possible running just HTML and CSS locally.
  - One thing I'm doing is trying to recreate it on the styleguide at http://localhost:4000/section-stage.html after running the styleguide
    - `background-*` seems to create painting problems- removing it doesn't show the jagged edges but there's no page jank either
    - leaving the `div` as `<div class="theme-rock stage--has-mask"></div>` does not show any jagged edges, but there is page jank 
- Review the Chromium bug list and write down all related issues here
- Explore other style issues that might be related (ie. `overflow` property)
