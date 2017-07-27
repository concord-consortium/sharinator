/* jshint esversion: 6 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const config = functions.config();
const querystring = require('querystring');
const cors = require('cors')({
  origin: true,
  credentials: true
});

admin.initializeApp(config.firebase);

const demoRef = (request, suffix) => {
  return admin.database().ref("/demos/" + request.query.demo + suffix);
};

exports.demoInteractiveRunState = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    // because the CFM doesn't expect the IRS url to already include query parameters the
    // request looks like this ?demo=<uid>&demoUser=<uid>?raw_data=...
    // so we need to manually parse the params
    const demoUserParts = request.query.demoUser.split("?");
    const demoUser = demoUserParts.shift();
    const query = demoUserParts.join("?");

    const user = demoRef(request, "/users/" + demoUser + "/interactiveState");

    switch (request.method) {
      case "GET":
        user.once("value", (snapshot) => {
          response.json(snapshot.val() || {});
        });
        break;

      case "PUT":
        user.once("value", (snapshot) => {
          var value = snapshot.val() || {};
          const params = querystring.parse(query || "");
          Object.keys(params).forEach((key) => {
            value[key] = params[key];
          });
          user.set(value, (error) => {
            if (error) {
              response.json(500, {success: false, error: error.toString()});
            }
            else {
              response.json(value);
            }
          });
        });
        break;

      default:
        response.json(405, {success: false, error: "Unsupported request method: " + request.method});
    }
  });
});

exports.demoClassInfo = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const demo = demoRef(request, "/classInfo");
    demo.once("value", (snapshot) => {
      response.json(snapshot.val());
    });
  });
});

exports.demoMyClasses = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    admin.database().ref("/demos").once("value", (snapshot) => {
      const demos = snapshot.val();
      const classes = Object.keys(demos).map((demoId) => {
        const demo = demos[demoId];
        return {
          uri: `https://us-central1-classroom-sharing.cloudfunctions.net/demoClassInfo?demo=${demoId}`,
          name: demo.classInfo.name,
          class_hash: demo.classInfo.class_hash
        };
      });
      response.json({classes: classes});
    });
  });
});
