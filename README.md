# Sharinator

Sharinator enables CODAP uses to share copies of their documents as well as export images and table contents from CODAP.

## Components

There are two components to Sharinator

* IFrame
* Dashboard

The IFrame component is used as the endpoint for the interactive iframe in LARA.  No parameters are needed as it supports
authoring mode in LARA.  The IFrame wraps CODAP and exposes an sidebar div that contains buttons to publish the current
document and view the class dashboard where other teacher and student documents from the class can be viewed.  It also contains
an export library manager that listens to exported images and csvs from the CFM.

The Dashboard is accessed via the "View" button the the IFrame sidebar.  It is passed a base64 encoded URL to the class
info api endpoint on the portal. The class info url is passed to LARA via the portal on each external resource run and
LARA persists the url in the run table.

## Setting up a Shariniator interactive

1. In LARA create a iframe interactive
2. Set the interactive url to http://sharinator.concord.org/iframe/ and save the interactive.
   You should see an authoring form displayed now asking for the LARA url from CODAP.
3. Open CODAP and create your authored document
4. Use the Share... > Get link to shared view menu option to open the sharing dialog
5. Click the "Enable Sharing" button
6. Switch to the LARA tab in the sharing dialog
7. Click the "Copy" link
8. Paste the link into the authoring form for the interactive in LARA

## Developer Notes

* All code is written in TypeScript
* React is used as the view engine
* Yarn is used to download the exact package versions needed
* Webpack is used to generate two bundles - one containing the iframe and dashboard and the other containing React
* There are a number of scripts setup in package.json to aid in development and publishing.  Currently these are:

```
"scripts": {
    "copy-public": "ncp src/public/ dist/",
    "copy-public:watch": "onchange \"src/public/**/*.*\" -v -- npm run copy-public",
    "webpack": "cross-env NODE_ENV=production webpack",
    "webpack:watch": "cross-env NODE_ENV=production webpack -w",
    "dev-webpack": "cross-env NODE_ENV=development webpack",
    "dev-webpack:watch": "cross-env NODE_ENV=development webpack -w",
    "browse": "live-server dist/",
    "build": "npm-run-all --parallel copy-public webpack",
    "dev-build": "npm-run-all --parallel copy-public dev-webpack",
    "start": "npm-run-all --parallel copy-public copy-public:watch webpack:watch browse",
    "dev-start": "npm-run-all --parallel copy-public copy-public:watch dev-webpack:watch browse"
  }
```

## License

Sharinator is released under the [MIT License](LICENSE).