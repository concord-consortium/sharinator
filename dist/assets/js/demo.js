webpackJsonp([2],{

/***/ 205:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var React = __webpack_require__(7);
var ReactDOM = __webpack_require__(15);
var demo_1 = __webpack_require__(29);
ReactDOM.render(React.createElement(demo_1.Demo, null), document.getElementById("app"));


/***/ }),

/***/ 29:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var iframe_1 = __webpack_require__(30);
var queryString = __webpack_require__(19);
var superagent = __webpack_require__(23);
var UID_LENGTH = 40;
function getParam(name) {
    var value = "";
    var params = (window.location.search.substr(1) || "").split("&");
    params.forEach(function (param) {
        var _a = param.split("="), key = _a[0], keyValue = _a[1], rest = _a.slice(2);
        if (key === name) {
            value = keyValue;
        }
    });
    return value;
}
exports.getParam = getParam;
function generateUID() {
    var i = 0;
    var uid = [];
    for (i = 0; i < UID_LENGTH; i++) {
        uid.push(String.fromCharCode(65 + (Math.random() * 26)));
    }
    return uid.join("");
}
exports.generateUID = generateUID;
function getUID(name) {
    var demoParam = getParam(name);
    return demoParam.length === UID_LENGTH ? demoParam : null;
}
exports.getUID = getUID;
var Demo = (function (_super) {
    __extends(Demo, _super);
    function Demo(props) {
        var _this = _super.call(this, props) || this;
        var demoUID = getUID("demo");
        _this.state = {
            error: null,
            codapURL: "",
            numTeachers: 1,
            numStudents: 10,
            demoUID: demoUID,
        };
        if (demoUID) {
            var demo = firebase.database().ref("demos/" + demoUID);
            demo.once("value", function (snapshot) {
                var firebaseData = snapshot.val();
                _this.setState({ demo: firebaseData });
            });
        }
        return _this;
    }
    Demo.prototype.numberChanged = function (e, input) {
        var intValue = e.currentTarget.value === "" ? 0 : parseInt(e.currentTarget.value, 10);
        if (!isNaN(intValue)) {
            if (input === this.refs.numTeachers) {
                this.setState({ numTeachers: intValue });
            }
            else {
                this.setState({ numStudents: intValue });
            }
        }
    };
    Demo.prototype.formSubmitted = function (e) {
        e.preventDefault();
        var codapURL = this.refs.codapURL.value;
        try {
            var authoredState = iframe_1.parseURLIntoAuthoredState(codapURL);
            var demoUID_1 = generateUID();
            var users = {};
            var teachers = [];
            var students = [];
            var i = 0;
            for (i = 0; i < this.state.numTeachers; i++) {
                var userUID = generateUID();
                users[generateUID()] = {
                    index: i,
                    type: "teacher",
                    name: "Teacher " + (i + 1),
                    email: "teacher" + (i + 1) + "@example.com",
                    interactiveState: null
                };
                teachers.push({
                    first_name: "Teacher",
                    last_name: "" + (i + 1)
                });
            }
            for (i = 0; i < this.state.numStudents; i++) {
                users[generateUID()] = {
                    index: i,
                    type: "student",
                    name: "Student " + (i + 1),
                    email: "student" + (i + 1) + "@example.com",
                    interactiveState: null
                };
                students.push({
                    first_name: "Student",
                    last_name: "" + (i + 1),
                    email: "student" + (i + 1) + "@example.com"
                });
            }
            var classInfo = {
                name: "Demo " + demoUID_1,
                class_hash: demoUID_1,
                students: students,
                teachers: teachers
            };
            var demo = firebase.database().ref("demos/" + demoUID_1);
            var demoInfo = {
                authoredState: authoredState,
                users: users,
                classInfo: classInfo
            };
            demo.set(demoInfo, function () {
                window.location.href = "?demo=" + demoUID_1;
            });
        }
        catch (e) {
            this.setState({ error: e.message });
        }
    };
    Demo.prototype.renderLinks = function () {
        var _this = this;
        if (!this.state.demo) {
            return React.createElement("div", null, "Loading...");
        }
        var users = this.state.demo.users;
        var teacherLinks = [];
        var studentLinks = [];
        var i = 0;
        Object.keys(users).forEach(function (userUID) {
            var user = users[userUID];
            var link = React.createElement("li", { key: userUID },
                React.createElement("a", { href: "../iframe/?demo=" + _this.state.demoUID + "&demoUser=" + userUID, target: "_blank" }, user.name));
            if (user.type === "teacher") {
                teacherLinks[user.index] = link;
            }
            else {
                studentLinks[user.index] = link;
            }
        });
        return (React.createElement("div", null,
            React.createElement("h1", null, "Demo Links"),
            React.createElement("h2", null, "Teachers"),
            React.createElement("ul", null, teacherLinks),
            React.createElement("h2", null, "Students"),
            React.createElement("ul", null, studentLinks)));
    };
    Demo.prototype.renderForm = function () {
        var _this = this;
        return (React.createElement("form", { onSubmit: this.formSubmitted.bind(this) },
            React.createElement("h1", null, "Demo Creator"),
            this.state.error ? React.createElement("div", { className: "error" }, this.state.error) : null,
            React.createElement("label", { htmlFor: "codapURL" }, "CODAP Lara Sharing URL"),
            React.createElement("input", { type: "text", ref: "codapURL", placeholder: "url here...", defaultValue: this.state.codapURL }),
            React.createElement("label", { htmlFor: "numTeachers" }, "Number of Teachers"),
            React.createElement("input", { type: "text", ref: "numTeachers", value: this.state.numTeachers > 0 ? this.state.numTeachers : "", onChange: function (e) { return _this.numberChanged(e, _this.refs.numTeachers); } }),
            React.createElement("label", { htmlFor: "numStudents" }, "Number of Students"),
            React.createElement("input", { type: "text", ref: "numStudents", value: this.state.numStudents > 0 ? this.state.numStudents : "", onChange: function (e) { return _this.numberChanged(e, _this.refs.numStudents); } }),
            React.createElement("div", null,
                React.createElement("input", { type: "submit", value: "Create Demo" }))));
    };
    Demo.prototype.render = function () {
        if (this.state.demoUID) {
            return this.renderLinks();
        }
        return this.renderForm();
    };
    return Demo;
}(React.Component));
exports.Demo = Demo;


/***/ }),

/***/ 30:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var iframe_overlay_1 = __webpack_require__(37);
var demo_1 = __webpack_require__(29);
var queryString = __webpack_require__(19);
var superagent = __webpack_require__(23);
var IFrame = (function (_super) {
    __extends(IFrame, _super);
    function IFrame(props) {
        var _this = _super.call(this, props) || this;
        _this.iframeCanAutosave = false;
        _this.submitAuthoringInfo = _this.submitAuthoringInfo.bind(_this);
        _this.getInteractiveState = _this.getInteractiveState.bind(_this);
        _this.setupNormalMode = _this.setupNormalMode.bind(_this);
        var demoUID = demo_1.getUID("demo");
        var demoUser = demo_1.getParam("demoUser");
        _this.state = {
            irsUrl: null,
            src: null,
            authoring: false,
            authoredState: null,
            authoringError: null,
            initInteractiveData: null,
            copyUrl: null,
            demoUID: demoUID,
            demoUser: demoUser
        };
        return _this;
    }
    IFrame.prototype.componentDidMount = function () {
        if (this.state.demoUID) {
            this.setupDemoMode();
        }
        else {
            // TODO: figure out why iframe phone needs the delay
            setTimeout(this.setupNormalMode, 1000);
        }
    };
    IFrame.prototype.setupDemoMode = function () {
        var _this = this;
        var demoRef = firebase.database().ref("demos/" + this.state.demoUID);
        demoRef.once("value", function (snapshot) {
            var demo = snapshot.val();
            var authoredState = demo.authoredState;
            var email = _this.state.demoUser ? demo.users[_this.state.demoUser].email : "no-email@example.com";
            var src = authoredState.autoLaunchUrl + "?" + queryString.stringify({ server: authoredState.codapUrl });
            var demoParams = "demo=" + _this.state.demoUID + "&demoUser=" + _this.state.demoUser;
            var demoAPIUrl = function (endPoint) {
                return "https://us-central1-classroom-sharing.cloudfunctions.net/" + endPoint + "?" + demoParams;
            };
            _this.setState({
                src: src,
                irsUrl: demoAPIUrl("demoInteractiveRunState"),
                initInteractiveData: {
                    version: 1,
                    error: null,
                    mode: "runtime",
                    authoredState: authoredState,
                    interactiveState: null,
                    globalInteractiveState: null,
                    hasLinkedInteractive: false,
                    linkedState: null,
                    interactiveStateUrl: demoAPIUrl("demoInteractiveRunState"),
                    collaboratorUrls: null,
                    publicClassHash: _this.state.demoUID,
                    classInfoUrl: demoAPIUrl("demoClassInfo"),
                    interactive: { id: 1, name: "demo" },
                    authInfo: { provider: "demo", loggedIn: true, email: email }
                },
                authoredState: authoredState
            });
            setTimeout(_this.getInteractiveState, 10);
        });
    };
    IFrame.prototype.setupNormalMode = function () {
        var _this = this;
        this.clientPhone = iframePhone.getIFrameEndpoint();
        this.clientPhone.addListener('initInteractive', function (data) {
            if (data.mode === "authoring") {
                _this.setState({
                    authoring: true,
                    authoredState: data.authoredState
                });
                return;
            }
            var authoredState = data.authoredState;
            var src = authoredState.autoLaunchUrl + "?" + queryString.stringify({ server: authoredState.codapUrl });
            _this.setState({
                src: src,
                irsUrl: data.interactiveStateUrl,
                initInteractiveData: data,
                authoredState: data.authoredState
            });
            if (data.interactiveStateUrl) {
                setTimeout(_this.getInteractiveState, 1000);
            }
        });
        this.clientPhone.addListener('getInteractiveState', function () {
            if (_this.iframeCanAutosave) {
                _this.postMessageToInnerIframe('cfm::autosave');
            }
            else {
                _this.clientPhone.post('interactiveState', 'nochange');
            }
        });
        this.clientPhone.initialize();
        this.clientPhone.post('supportedFeatures', {
            apiVersion: 1,
            features: {
                authoredState: true,
                interactiveState: true
            }
        });
    };
    IFrame.prototype.postMessageToInnerIframe = function (type) {
        if (this.refs.iframe) {
            this.refs.iframe.contentWindow.postMessage({ type: type }, '*');
        }
    };
    IFrame.prototype.componentDidUpdate = function () {
        var _this = this;
        if (this.state.authoring) {
            this.refs.laraSharedUrl.focus();
        }
        else if (this.refs.iframe && !this.serverPhone) {
            // proxy the result of the initInteractive message from LARA to the docstore
            this.serverPhone = new iframePhone.ParentEndpoint(this.refs.iframe, function () {
                _this.serverPhone.post("initInteractive", _this.state.initInteractiveData);
            });
            // setup a generic postmessage CFM listener for the iframed CODAP window that autolaunch loads
            // we can't use the serverPhone here because it is an iframe embedded in an iframe
            var keepPollingForCommands_1 = true;
            window.onmessage = function (e) {
                switch (e.data.type) {
                    case "cfm::commands":
                        _this.iframeCanAutosave = e.data.commands && e.data.commands.indexOf('cfm::autosave') !== -1;
                        keepPollingForCommands_1 = false;
                        break;
                    case "cfm::autosaved":
                        if (_this.clientPhone) {
                            _this.clientPhone.post('interactiveState', 'nochange');
                        }
                        break;
                }
            };
            // keep asking for the cfm commands available until we get a response once the inner iframe loads
            var pollForCommandList_1 = function () {
                if (keepPollingForCommands_1) {
                    _this.postMessageToInnerIframe('cfm::getCommands');
                    setTimeout(pollForCommandList_1, 100);
                }
            };
            pollForCommandList_1();
        }
    };
    IFrame.prototype.getInteractiveState = function () {
        var _this = this;
        var iframe = this;
        superagent
            .get(this.state.irsUrl)
            .withCredentials()
            .set('Accept', 'application/json')
            .end(function (err, res) {
            if (!err) {
                try {
                    var json = JSON.parse(res.text);
                    if (json && json.raw_data) {
                        var rawData = JSON.parse(json.raw_data);
                        if (rawData && rawData.docStore && rawData.docStore.accessKeys && rawData.docStore.accessKeys.readOnly && _this.state.authoredState) {
                            iframe.setState({
                                copyUrl: _this.state.authoredState.docStoreUrl + "/v2/documents?source=" + rawData.docStore.recordid + "&accessKey=RO::" + rawData.docStore.accessKeys.readOnly,
                            });
                        }
                        return;
                    }
                }
                catch (e) { }
                setTimeout(_this.getInteractiveState, 1000);
            }
        });
    };
    IFrame.prototype.submitAuthoringInfo = function (e) {
        e.preventDefault();
        try {
            var authoredState = parseURLIntoAuthoredState(this.refs.laraSharedUrl.value);
            this.setState({ authoringError: null });
            this.clientPhone.post('authoredState', authoredState);
        }
        catch (e) {
            this.setState({ authoringError: e.message });
        }
    };
    IFrame.prototype.renderAuthoring = function () {
        var inputStyle = { width: "100%" };
        var errorStyle = { color: "#f00", marginTop: 10, marginBottom: 10 };
        var url = (this.state.authoredState ? this.state.authoredState.laraSharedUrl : "") || "";
        return React.createElement("form", { onSubmit: this.submitAuthoringInfo },
            this.state.authoringError ? React.createElement("div", { style: errorStyle }, this.state.authoringError) : null,
            React.createElement("label", { htmlFor: "laraSharedUrl" }, "Shared URL from LARA tab in CODAP"),
            React.createElement("input", { type: "text", id: "laraSharedUrl", ref: "laraSharedUrl", style: inputStyle, defaultValue: url }),
            React.createElement("input", { type: "submit", value: "Save" }));
    };
    IFrame.prototype.renderIFrame = function () {
        if (this.state.src) {
            return React.createElement("div", { id: "iframe" },
                React.createElement("iframe", { ref: "iframe", src: this.state.src }),
                React.createElement(iframe_overlay_1.IFrameOverlay, { initInteractiveData: this.state.initInteractiveData, copyUrl: this.state.copyUrl, authoredState: this.state.authoredState }));
        }
        return null;
    };
    IFrame.prototype.render = function () {
        if (this.state.authoring) {
            return this.renderAuthoring();
        }
        return this.renderIFrame();
    };
    return IFrame;
}(React.Component));
exports.IFrame = IFrame;
function parseURLIntoAuthoredState(url) {
    var _a = url.split("?"), docStoreUrl = _a[0], query = _a[1], rest = _a.slice(2);
    var urlMatches = docStoreUrl.match(/^((https?:\/\/[^/]+\/)v2\/documents\/\d+\/(auto)?launch)/);
    var launchParams = queryString.parse(query || "");
    var matchProtocol = function (url) {
        var a = document.createElement("a");
        a.href = url;
        a.protocol = location.protocol;
        return a.href;
    };
    if (!urlMatches || !launchParams.server) {
        throw new Error("This URL does not appear to be a shared URL from the LARA tab in CODAP");
    }
    docStoreUrl = matchProtocol(urlMatches[2].replace(/\/+$/, "")); // remove trailing slashes
    var codapUrl;
    _b = launchParams.server.split("?"), codapUrl = _b[0], query = _b[1], rest = _b.slice(2);
    var codapParams = queryString.parse(query || "");
    codapParams.componentMode = "yes";
    codapParams.documentServer = docStoreUrl;
    codapParams.saveSecondaryFileViaPostMessage = "yes";
    codapUrl = matchProtocol(codapUrl + "?" + queryString.stringify(codapParams));
    var authoredState = {
        laraSharedUrl: url,
        docStoreUrl: codapParams.documentServer,
        autoLaunchUrl: matchProtocol(urlMatches[1].replace("/launch", "/autolaunch")),
        codapUrl: codapUrl
    };
    return authoredState;
    var _b;
}
exports.parseURLIntoAuthoredState = parseURLIntoAuthoredState;


/***/ })

},[205]);
//# sourceMappingURL=demo.js.map