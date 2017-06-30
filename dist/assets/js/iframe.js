webpackJsonp([1],{

/***/ 204:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var React = __webpack_require__(7);
var ReactDOM = __webpack_require__(15);
var iframe_1 = __webpack_require__(31);
ReactDOM.render(React.createElement(iframe_1.IFrame, null), document.getElementById("app"));


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
var iframe_1 = __webpack_require__(31);
var queryString = __webpack_require__(16);
var superagent = __webpack_require__(20);
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
                    last_name: "" + (i + 1),
                    email: "teacher" + (i + 1) + "@example.com"
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

/***/ 31:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var iframe_sidebar_1 = __webpack_require__(40);
var demo_1 = __webpack_require__(30);
var queryString = __webpack_require__(16);
var superagent = __webpack_require__(20);
var base64url = __webpack_require__(24);
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
            demoUser: demoUser,
            codapPhone: null
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
    IFrame.prototype.generateIframeSrc = function (initInteractiveData) {
        var authoredState = initInteractiveData.authoredState;
        var launchParams = { url: initInteractiveData.interactiveStateUrl, source: authoredState.documentId, collaboratorUrls: initInteractiveData.collaboratorUrls };
        var linkedState = initInteractiveData.linkedState || {};
        var interactiveRunState = initInteractiveData.interactiveState || {};
        var codapParams = authoredState.codapParams || {};
        // if there is a linked state and no interactive state then change the source document to point to the linked recordid and add the access key
        if (linkedState.docStore && linkedState.docStore.recordid && linkedState.docStore.accessKeys && linkedState.docStore.accessKeys.readOnly && !(interactiveRunState && interactiveRunState.docStore && interactiveRunState.docStore.recordid)) {
            launchParams.source = linkedState.docStore.recordid;
            launchParams.readOnlyKey = linkedState.docStore.accessKeys.readOnly;
        }
        //codapParams.componentMode = "yes"
        codapParams.embeddedServer = "yes";
        codapParams.documentServer = authoredState.docStoreUrl;
        codapParams.launchFromLara = base64url.encode(JSON.stringify(launchParams));
        return authoredState.codapUrl + "?" + queryString.stringify(codapParams);
    };
    IFrame.prototype.setupDemoMode = function () {
        var _this = this;
        var demoRef = firebase.database().ref("demos/" + this.state.demoUID);
        demoRef.once("value", function (snapshot) {
            var demo = snapshot.val();
            var demoParams = "demo=" + _this.state.demoUID + "&demoUser=" + _this.state.demoUser;
            var demoAPIUrl = function (endPoint) { return "https://us-central1-classroom-sharing.cloudfunctions.net/" + endPoint + "?" + demoParams; };
            var email = _this.state.demoUser ? demo.users[_this.state.demoUser].email : "no-email@example.com";
            var initInteractiveData = {
                version: 1,
                error: null,
                mode: "runtime",
                authoredState: demo.authoredState,
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
            };
            _this.setState({
                src: _this.generateIframeSrc(initInteractiveData),
                irsUrl: demoAPIUrl("demoInteractiveRunState"),
                initInteractiveData: initInteractiveData,
                authoredState: demo.authoredState
            });
            setTimeout(_this.getInteractiveState, 10);
        });
    };
    IFrame.prototype.setupNormalMode = function () {
        var _this = this;
        this.clientPhone = iframePhone.getIFrameEndpoint();
        this.clientPhone.addListener('initInteractive', function (initInteractiveData) {
            var authoredState = null;
            if (typeof initInteractiveData.authoredState === "string") {
                try {
                    authoredState = JSON.parse(initInteractiveData.authoredState);
                }
                catch (e) { }
            }
            else {
                authoredState = initInteractiveData.authoredState;
            }
            if (initInteractiveData.mode === "authoring") {
                _this.setState({
                    authoring: true,
                    authoredState: authoredState
                });
                return;
            }
            _this.setState({
                src: _this.generateIframeSrc(initInteractiveData),
                irsUrl: initInteractiveData.interactiveStateUrl,
                initInteractiveData: initInteractiveData,
                authoredState: authoredState
            });
            if (initInteractiveData.interactiveStateUrl) {
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
    IFrame.prototype.codapPhoneHandler = function (command, callback) {
        var success = false;
        if (command) {
            switch (command.message) {
                case "codap-present":
                    success = true;
                    break;
            }
        }
        callback({ success: success });
    };
    IFrame.prototype.componentDidUpdate = function () {
        var _this = this;
        if (this.state.authoring) {
            this.refs.laraSharedUrl.focus();
        }
        else if (this.refs.iframe && !this.state.codapPhone) {
            this.setState({ codapPhone: new iframePhone.IframePhoneRpcEndpoint(this.codapPhoneHandler.bind(this), "data-interactive", this.refs.iframe) });
            // setup a generic postmessage CFM listener for the iframed CODAP window
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
        if (this.state.src && this.state.initInteractiveData) {
            return React.createElement("div", null,
                React.createElement("div", { id: "iframe-container" },
                    React.createElement("iframe", { ref: "iframe", src: this.state.src })),
                React.createElement(iframe_sidebar_1.IFrameSidebar, { initInteractiveData: this.state.initInteractiveData, copyUrl: this.state.copyUrl, authoredState: this.state.authoredState, codapPhone: this.state.codapPhone }));
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
    var _a = url.split("?"), docStoreUrl = _a[0], urlQuery = _a[1], restOfUrl = _a.slice(2);
    var urlMatches = docStoreUrl.match(/^(https?:\/\/[^/]+\/)v2\/documents\/(\d+)\/(auto)?launch/);
    var launchParams = queryString.parse(urlQuery || "");
    if (!urlMatches || !launchParams.server) {
        throw new Error("This URL does not appear to be a shared URL from the LARA tab in CODAP");
    }
    var _b = launchParams.server.split("?"), codapUrl = _b[0], serverQuery = _b[1], restOfServer = _b.slice(2);
    var codapParams = queryString.parse(serverQuery || "");
    var matchProtocol = function (url) {
        var a = document.createElement("a");
        a.href = url;
        a.protocol = location.protocol;
        return a.href;
    };
    var authoredState = {
        laraSharedUrl: url,
        docStoreUrl: matchProtocol(urlMatches[1].replace(/\/+$/, "")),
        codapUrl: matchProtocol(codapUrl),
        codapParams: codapParams,
        documentId: urlMatches[2]
    };
    return authoredState;
}
exports.parseURLIntoAuthoredState = parseURLIntoAuthoredState;


/***/ }),

/***/ 40:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var class_info_1 = __webpack_require__(38);
var escape_firebase_key_1 = __webpack_require__(39);
var queryString = __webpack_require__(16);
var base64url = __webpack_require__(24);
var superagent = __webpack_require__(20);
var UserInteractives = (function (_super) {
    __extends(UserInteractives, _super);
    function UserInteractives(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            showAll: false
        };
        _this.toggleShowAll = _this.toggleShowAll.bind(_this);
        return _this;
    }
    UserInteractives.prototype.toggleShowAll = function () {
        this.setState({ showAll: !this.state.showAll });
    };
    UserInteractives.prototype.getVersion = function (index) {
        return this.props.userInteractives.userInteractives.length - index;
    };
    UserInteractives.prototype.renderAll = function () {
        var _this = this;
        if (!this.state.showAll) {
            return null;
        }
        var userInteractives = this.props.userInteractives;
        return this.props.userInteractives.userInteractives.slice(1).map(function (userInteractive, index) {
            return (React.createElement(UserInteractive, { key: userInteractive.createdAt, userInteractive: userInteractive, version: _this.getVersion(index + 1), classHash: _this.props.classHash, interactiveId: _this.props.interactiveId, initInteractiveData: _this.props.initInteractiveData, email: _this.props.userInteractives.email, codapPhone: _this.props.codapPhone, first: false, myEmail: _this.props.myEmail, classInfo: _this.props.classInfo }));
        });
    };
    UserInteractives.prototype.render = function () {
        var userInteractives = this.props.userInteractives;
        var hasMoreThanOne = userInteractives.userInteractives.length > 1;
        return (React.createElement("div", { className: "user-interactives" },
            React.createElement("div", { className: "user-interactives-name", onClick: this.toggleShowAll }, userInteractives.name),
            React.createElement(UserInteractive, { userInteractive: userInteractives.userInteractives[0], version: this.getVersion(0), classHash: this.props.classHash, interactiveId: this.props.interactiveId, email: this.props.email, codapPhone: this.props.codapPhone, first: true, initInteractiveData: this.props.initInteractiveData, myEmail: this.props.myEmail, classInfo: this.props.classInfo }),
            this.renderAll()));
    };
    return UserInteractives;
}(React.Component));
exports.UserInteractives = UserInteractives;
var UserInteractive = (function (_super) {
    __extends(UserInteractive, _super);
    function UserInteractive(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {};
        return _this;
    }
    UserInteractive.prototype.renderCreatedAt = function () {
        var now = (new Date()).getTime();
        var diff = Math.max(now - this.props.userInteractive.createdAt, 0) / 1000;
        var plural = function (count) { return count === 1 ? "" : "s"; };
        var when = "Just now";
        if (diff > 59) {
            if (diff < 60 * 60) {
                var minutes = Math.round(diff / 60);
                when = minutes + " minute" + plural(minutes) + " ago";
            }
            else if (diff < 60 * 60 * 24) {
                var hours = Math.round(diff / (60 * 60));
                when = hours + " hour" + plural(hours) + " ago";
            }
            else {
                var days = Math.round(diff / (60 * 60 * 24));
                when = days + " day" + plural(days) + " ago";
            }
        }
        return React.createElement("div", { className: "user-interactive-created-at" }, when);
    };
    UserInteractive.prototype.render = function () {
        var _this = this;
        var userInteractive = this.props.userInteractive;
        return (React.createElement("div", { className: "user-interactive " + (!this.props.first ? 'user-interactive-with-border' : '') },
            React.createElement(UserInteractiveDocument, { userInteractive: userInteractive, version: this.props.version, classHash: this.props.classHash, interactiveId: this.props.interactiveId, initInteractiveData: this.props.initInteractiveData, email: this.props.email }),
            Object.keys(userInteractive.dataContexts).map(function (firebaseId) {
                return (React.createElement(UserInteractiveDataContext, { key: firebaseId, dataContextId: firebaseId, dataContextName: userInteractive.dataContexts[firebaseId], version: _this.props.version, classHash: _this.props.classHash, interactiveId: _this.props.interactiveId, email: _this.props.email, codapPhone: _this.props.codapPhone, myEmail: _this.props.myEmail, classInfo: _this.props.classInfo }));
            }),
            this.renderCreatedAt()));
    };
    return UserInteractive;
}(React.Component));
exports.UserInteractive = UserInteractive;
var UserInteractiveDocument = (function (_super) {
    __extends(UserInteractiveDocument, _super);
    function UserInteractiveDocument(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            showOptions: false
        };
        _this.toggleShowOptions = _this.toggleShowOptions.bind(_this);
        _this.handleReplace = _this.handleReplace.bind(_this);
        return _this;
    }
    UserInteractiveDocument.prototype.toggleShowOptions = function () {
        this.setState({ showOptions: !this.state.showOptions });
    };
    UserInteractiveDocument.prototype.handleReplace = function () {
    };
    UserInteractiveDocument.prototype.renderOptions = function () {
        if (!this.state.showOptions) {
            return null;
        }
        var classUrl = base64url.encode(this.props.initInteractiveData.classInfoUrl);
        var href = "../dashboard/?class=" + classUrl + "&interactive=" + this.props.interactiveId + "&user=" + this.props.email + "&createdAt=" + this.props.userInteractive.createdAt;
        return (React.createElement("div", { className: "user-interactive-document-options" },
            React.createElement("a", { className: "user-interactive-view-document user-interactive-option", href: href, target: "_blank" }, "View In Dashboard"),
            React.createElement("div", { className: "user-interactive-replace-document user-interactive-option" }, "TDB: Replace My Document")));
    };
    UserInteractiveDocument.prototype.render = function () {
        return (React.createElement("div", null,
            React.createElement("div", { className: "user-interactive-document", onClick: this.toggleShowOptions },
                "Document #",
                this.props.version),
            this.renderOptions()));
    };
    return UserInteractiveDocument;
}(React.Component));
exports.UserInteractiveDocument = UserInteractiveDocument;
var UserInteractiveDataContext = (function (_super) {
    __extends(UserInteractiveDataContext, _super);
    function UserInteractiveDataContext(props) {
        var _this = _super.call(this, props) || this;
        _this.loading = false;
        _this.tree = null;
        _this.state = {
            showOptions: false,
            copyState: null,
            mergeState: null,
            dataContext: null
        };
        _this.toggleShowOptions = _this.toggleShowOptions.bind(_this);
        _this.handleCopy = _this.handleCopy.bind(_this);
        _this.handleMerge = _this.handleMerge.bind(_this);
        return _this;
    }
    UserInteractiveDataContext.prototype.loadDataContext = function () {
        var _this = this;
        if (!this.loading && (this.state.dataContext === null)) {
            this.loading = true;
            var dataContextRef = firebase.database().ref("dataContexts/" + this.props.classHash + "/" + this.props.email + "/interactive_" + this.props.interactiveId + "/" + this.props.dataContextId);
            dataContextRef.once("value", function (snapshot) {
                try {
                    // convert to a tree
                    var tree_1 = {};
                    var leaves_1 = {};
                    var dataContext_1 = JSON.parse(snapshot.val());
                    Object.keys(dataContext_1.cases).forEach(function (id) {
                        var _case = dataContext_1.cases[id];
                        var parent = _case.parent ? leaves_1[_case.parent] : null;
                        var leaf = {
                            values: _case.values,
                            collection: dataContext_1.collections[_case.collection].name,
                            children: {},
                            parent: parent
                        };
                        leaves_1[id] = leaf;
                        if (parent) {
                            parent.children[id] = leaf;
                        }
                        else {
                            tree_1[id] = leaf;
                        }
                    });
                    _this.tree = tree_1;
                    _this.setState({ dataContext: dataContext_1 });
                }
                catch (e) {
                }
            });
        }
    };
    UserInteractiveDataContext.prototype.toggleShowOptions = function () {
        this.loadDataContext();
        this.setState({ showOptions: !this.state.showOptions });
    };
    UserInteractiveDataContext.prototype.handleMerge = function () {
        var _this = this;
        var dataContextName = this.state.dataContext.name;
        var mergedUserCollectionName = "Merged";
        var mergedUserCollectionTitle = "Merged";
        var mergedUserAttributeName = "User";
        var mergedUserAttributeTitle = "User";
        var mergedEmailAttributeName = "Email";
        var mergedEmailAttributeTitle = "Email";
        this.setState({ mergeState: "Merging..." });
        var merge = function () {
            addOrClearMergedUser(function (parentId, childrenToRemove) {
                addCases(_this.tree, parentId, function () {
                    removeCases(childrenToRemove, function () {
                        _this.setState({ mergeState: "Merged" });
                        setTimeout(function () {
                            _this.setState({ mergeState: null });
                        }, 2000);
                    });
                });
            });
        };
        var removeCases = function (cases, callback) {
            if (cases.length > 0) {
                var actions = cases.map(function (_case) {
                    return {
                        action: 'delete',
                        resource: "dataContext[" + dataContextName + "].collection[" + _case.collection.name + "].caseByID[" + _case.id + "]"
                    };
                });
                _this.props.codapPhone.call(actions, function (result) {
                    callback();
                });
            }
            else {
                callback();
            }
        };
        var addOrClearMergedUser = function (callback) {
            var createNewMergedUser = function (childrenToRemove) {
                var values = {};
                var them = _this.props.classInfo.getUserName(_this.props.email);
                values[mergedUserAttributeName] = them.found ? them.name : _this.props.email;
                values[mergedEmailAttributeName] = _this.props.email;
                _this.props.codapPhone.call({
                    action: 'create',
                    resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "].case",
                    values: [{
                            parent: null,
                            values: values
                        }]
                }, function (result) {
                    callback(result.values[0].id, childrenToRemove);
                });
            };
            _this.props.codapPhone.call({
                action: 'get',
                resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "].caseSearch[" + mergedEmailAttributeName + "==" + _this.props.email + "]"
            }, function (result) {
                if (result.success && (result.values.length > 0)) {
                    var parentId = result.values[0].id;
                    _this.props.codapPhone.call({
                        action: 'get',
                        resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "].caseByID[" + parentId + "]"
                    }, function (result) {
                        var actions = result.values.case.children.map(function (childId) {
                            return {
                                action: 'get',
                                resource: "dataContext[" + dataContextName + "].caseByID[" + childId + "]"
                            };
                        });
                        _this.props.codapPhone.call(actions, function (result) {
                            var casesToDelete = result.map(function (result) { return result.values.case; });
                            callback(parentId, result.map(function (result) { return result.values.case; }));
                        });
                    });
                }
                else {
                    createNewMergedUser([]);
                }
            });
        };
        var addCases = function (branch, parentId, callback) {
            var atRoot = branch === _this.tree;
            var cases = Object.keys(branch).map(function (id) { return branch[id]; });
            var checkIfDone = function () {
                if (atRoot) {
                    callback();
                }
            };
            var addEachCase = function () {
                if (cases.length === 0) {
                    checkIfDone();
                }
                else {
                    var _case_1 = cases.shift();
                    _this.props.codapPhone.call({
                        action: 'create',
                        resource: "dataContext[" + dataContextName + "].collection[" + _case_1.collection + "].case",
                        values: {
                            parent: parentId,
                            values: _case_1.values
                        }
                    }, function (result) {
                        addCases(_case_1.children, result.values[0].id, callback);
                        addEachCase();
                    });
                }
            };
            var addAllCases = function () {
                var values = cases.map(function (_case) { return { parent: parentId, values: _case.values }; });
                _this.props.codapPhone.call({
                    action: 'create',
                    resource: "dataContext[" + dataContextName + "].collection[" + cases[0].collection + "].case",
                    values: values
                }, function (result) {
                    checkIfDone();
                });
            };
            var processCases = function () {
                if (cases.length === 0) {
                    checkIfDone();
                }
                else {
                    if (Object.keys(cases[0].children).length > 0) {
                        // case has children so we need to add each case one and a time to get the id
                        addEachCase();
                    }
                    else {
                        // no children so we can bulk add all the cases
                        addAllCases();
                    }
                }
            };
            processCases();
        };
        var addUserAttribute = function (callback) {
            var collections = _this.state.dataContext.collections;
            var collectionNames = Object.keys(collections).map(function (id) { return collections[id].name; });
            var addUserAttributeToCollection = function () {
                if (collectionNames.length === 0) {
                    callback();
                }
                else {
                    var collectionName = collectionNames.shift();
                    // create the merge attribute
                    _this.props.codapPhone.call({
                        action: 'create',
                        resource: "dataContext[" + dataContextName + "].collection[" + collectionName + "].attribute",
                        values: {
                            name: mergedUserAttributeName,
                            title: mergedUserAttributeTitle
                        }
                    }, function (result) {
                        addUserAttributeToCollection();
                    });
                }
            };
            addUserAttributeToCollection();
        };
        var checkIfMergedCollectionExists = function (callback) {
            _this.props.codapPhone.call({
                action: 'get',
                resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "]"
            }, function (result) {
                callback(result.success);
            });
        };
        var createMergedCollection = function (callback) {
            _this.props.codapPhone.call({
                action: 'create',
                resource: "dataContext[" + dataContextName + "].collection",
                values: {
                    name: mergedUserCollectionName,
                    title: mergedUserCollectionTitle,
                    parent: "_root_"
                }
            }, function (result) {
                callback();
            });
        };
        var moveUserAttribute = function (callback) {
            _this.props.codapPhone.call({
                action: 'update',
                resource: "dataContext[" + dataContextName + "].attributeLocation[" + mergedUserAttributeName + "]",
                values: {
                    collection: mergedUserCollectionName
                }
            }, function (result) {
                callback();
            });
        };
        var createEmailAttribute = function (callback) {
            _this.props.codapPhone.call({
                action: 'create',
                resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "].attribute",
                values: {
                    name: mergedEmailAttributeName,
                    title: mergedEmailAttributeTitle,
                    hidden: true
                }
            }, function (result) {
                callback();
            });
        };
        var setUserAndEmailAttribute = function (callback) {
            _this.props.codapPhone.call({
                action: "get",
                resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "].allCases"
            }, function (result) {
                var values = {};
                var me = _this.props.classInfo.getUserName(_this.props.myEmail);
                values[mergedUserAttributeName] = me.found ? me.name : _this.props.myEmail;
                values[mergedEmailAttributeName] = _this.props.myEmail;
                var requests = result.values.cases.map(function (_case) {
                    return {
                        action: 'update',
                        resource: "dataContext[" + dataContextName + "].collection[" + mergedUserCollectionName + "].caseByID[" + _case.case.id + "]",
                        values: {
                            values: values
                        }
                    };
                });
                _this.props.codapPhone.call(requests, function (result) {
                    callback();
                });
            });
        };
        checkIfMergedCollectionExists(function (exists) {
            if (exists) {
                merge();
            }
            else {
                addUserAttribute(function () {
                    createMergedCollection(function () {
                        moveUserAttribute(function () {
                            createEmailAttribute(function () {
                                setUserAndEmailAttribute(function () {
                                    merge();
                                });
                            });
                        });
                    });
                });
            }
        });
    };
    UserInteractiveDataContext.prototype.handleCopy = function () {
        var _this = this;
        this.setState({ copyState: "Copying..." });
        var addItemValues = function (item, row) {
            Object.keys(item.values).forEach(function (key) {
                row[key] = item.values[key];
            });
        };
        var addParentValues = function (item, row) {
            if (item.parent) {
                addParentValues(item.parent, row);
                addItemValues(item.parent, row);
            }
        };
        var addToRows = function (item, rows) {
            if (Object.keys(item.children).length !== 0) {
                Object.keys(item.children).forEach(function (id) {
                    addToRows(item.children[id], rows);
                });
            }
            else {
                var row = {};
                addParentValues(item, row);
                addItemValues(item, row);
                rows.push(row);
            }
        };
        // create tables for each top level collection
        var tables = [];
        Object.keys(this.tree).forEach(function (id) {
            var rows = [];
            addToRows(_this.tree[id], rows);
            if (rows.length > 0) {
                var tableHeader = Object.keys(rows[0]).map(function (col) {
                    return "<th>" + col + "</th>";
                }).join("");
                var tableRows = rows.map(function (row) {
                    var tds = Object.keys(row).map(function (col) {
                        return "<td>" + row[col] + "</td>";
                    }).join("");
                    return "<tr>" + tds + "</tr>";
                }).join("");
                tables.push("<table width='100%'><thead><tr>" + tableHeader + "</tr></thead><tbody>" + tableRows + "</tbody></table>");
            }
            // copy to clipboard
            var content = tables.join("");
            var copied = false;
            var selection, range, mark;
            try {
                mark = document.createElement("mark");
                mark.innerHTML = content;
                document.body.appendChild(mark);
                selection = document.getSelection();
                selection.removeAllRanges();
                range = document.createRange();
                range.selectNode(mark);
                selection.addRange(range);
                copied = document.execCommand("copy");
            }
            catch (e) {
                try {
                    window.clipboardData.setData("text", content);
                    copied = true;
                }
                catch (e) {
                    copied = false;
                }
            }
            finally {
                if (selection) {
                    if (range && (typeof selection.removeRange === "function")) {
                        selection.removeRange(range);
                    }
                    else {
                        selection.removeAllRanges();
                    }
                }
                if (mark) {
                    document.body.removeChild(mark);
                }
                _this.setState({ copyState: copied ? "Copied" : "Could not copy!" });
                setTimeout(function () {
                    _this.setState({ copyState: null });
                }, 2000);
            }
        });
    };
    UserInteractiveDataContext.prototype.renderOptions = function () {
        if (!this.state.showOptions) {
            return null;
        }
        if (!this.state.dataContext) {
            return (React.createElement("div", { className: "user-interactive-datacontext-options" }, "Loading data..."));
        }
        return (React.createElement("div", { className: "user-interactive-datacontext-options" },
            React.createElement("div", { className: "user-interactive-merge-datacontext user-interactive-option", onClick: this.handleMerge }, "Merge Into My Document"),
            this.state.mergeState ? React.createElement("div", { className: "user-interactive-action-state" }, this.state.mergeState) : null,
            React.createElement("div", { className: "user-interactive-copy-datacontext user-interactive-option", onClick: this.handleCopy }, "Copy To Clipboard"),
            this.state.copyState ? React.createElement("div", { className: "user-interactive-action-state" }, this.state.copyState) : null));
    };
    UserInteractiveDataContext.prototype.render = function () {
        return (React.createElement("div", null,
            React.createElement("div", { className: "user-interactive-datacontext", onClick: this.toggleShowOptions },
                this.props.dataContextName,
                " #",
                this.props.version),
            this.renderOptions()));
    };
    return UserInteractiveDataContext;
}(React.Component));
exports.UserInteractiveDataContext = UserInteractiveDataContext;
var IFrameSidebar = (function (_super) {
    __extends(IFrameSidebar, _super);
    function IFrameSidebar(props) {
        var _this = _super.call(this, props) || this;
        _this.onPublish = _this.onPublish.bind(_this);
        _this.state = {
            error: null,
            classHash: null,
            publishing: false,
            publishingError: null,
            publishingStatus: null,
            userInteractives: [],
            myEmail: _this.props.initInteractiveData.authInfo.email
        };
        _this.classInfo = new class_info_1.ClassInfo(_this.props.initInteractiveData.classInfoUrl || "");
        return _this;
    }
    IFrameSidebar.prototype.componentWillMount = function () {
        var _this = this;
        this.classInfo.getClassInfo(function (err, info) {
            if (err) {
                _this.setState({ error: err });
                return;
            }
            _this.setState({
                classHash: info.classHash
            });
            var refName = "classes/" + info.classHash;
            _this.classroomRef = firebase.database().ref(refName);
            _this.classroomRef.on("value", function (snapshot) {
                var firebaseData = snapshot.val();
                var publishedUserInteractives = [];
                var interactiveKey = "interactive_" + _this.props.initInteractiveData.interactive.id;
                var sortUserInteractives = function (a, b) {
                    return b.createdAt - a.createdAt;
                };
                if (firebaseData) {
                    var usernameNotFound_1 = false;
                    Object.keys(firebaseData.users || {}).forEach(function (email) {
                        var interactive = (firebaseData.users[email].interactives || {})[interactiveKey];
                        if (interactive) {
                            var userInteractives_1 = [];
                            var user = _this.classInfo.getUserName(email);
                            usernameNotFound_1 = usernameNotFound_1 || !user.found;
                            Object.keys(interactive).forEach(function (publishKey) {
                                userInteractives_1.push(interactive[publishKey]);
                            });
                            if (userInteractives_1.length > 0) {
                                publishedUserInteractives.push({
                                    email: email,
                                    name: user.name,
                                    type: "student",
                                    userInteractives: userInteractives_1.sort(sortUserInteractives)
                                });
                            }
                        }
                    });
                    if (usernameNotFound_1) {
                        _this.classInfo.getStudentNames(function (err, names) {
                            if (!err) {
                                var userInteractives = _this.state.userInteractives.slice();
                                userInteractives.forEach(function (userInteractive) {
                                    userInteractive.name = _this.classInfo.getUserName(userInteractive.email).name;
                                });
                            }
                        });
                    }
                }
                _this.setState({ userInteractives: publishedUserInteractives });
            });
        });
    };
    IFrameSidebar.prototype.saveDataContexts = function (userDataContextsKey, callback) {
        var _this = this;
        this.props.codapPhone.call({
            action: 'get',
            resource: 'dataContextList'
        }, function (result) {
            result = result || { success: false, values: { error: "Unable to get list of data contexts!" } };
            if (!result.success) {
                return callback(result.values.error);
            }
            var dataContexts = [];
            var uniqueDataContextNames = [];
            var collectionRequests = [];
            result.values.forEach(function (value) {
                // in testing it was found that sometimes duplicate data context names are returned
                if (uniqueDataContextNames.indexOf(value.name) !== -1) {
                    return;
                }
                uniqueDataContextNames.push(value.name);
                dataContexts.push({
                    name: value.name,
                    title: value.title,
                    collections: {},
                    cases: {}
                });
                collectionRequests.push({
                    action: "get",
                    resource: "dataContext[" + value.name + "].collectionList"
                });
            });
            _this.props.codapPhone.call(collectionRequests, function (results) {
                results = results || [{ success: false, values: { error: "Unable to get list of collections!" } }];
                var error = null;
                var dataContextForRequest = [];
                var caseRequests = [];
                results.forEach(function (result, dataContextIndex) {
                    if (error || !result.success) {
                        error = error || result.values.error;
                        return;
                    }
                    var dataContext = dataContexts[dataContextIndex];
                    result.values.forEach(function (value) {
                        dataContext.collections[value.id] = {
                            name: value.name,
                            title: value.title
                        };
                        dataContextForRequest.push(dataContext);
                        caseRequests.push({
                            action: "get",
                            resource: "dataContext[" + dataContext.name + "].collection[" + value.name + "].allCases"
                        });
                    });
                });
                if (error) {
                    return callback(error);
                }
                _this.props.codapPhone.call(caseRequests, function (results) {
                    results = results || [{ success: false, values: { error: "Unable to get case data!" } }];
                    var error = null;
                    results.forEach(function (result, requestIndex) {
                        if (error || !result.success) {
                            error = error || result.values.error;
                            return;
                        }
                        var dataContext = dataContextForRequest[requestIndex];
                        var collectionId = result.values.collection.id;
                        result.values.cases.forEach(function (_case) {
                            if (_case.hasOwnProperty('caseIndex')) {
                                dataContext.cases[_case.case.id] = {
                                    parent: _case.case.parent || null,
                                    values: _case.case.values,
                                    collection: collectionId
                                };
                            }
                        });
                    });
                    var dataContextMap = {};
                    var userDataContextsRef = firebase.database().ref(userDataContextsKey);
                    dataContexts.forEach(function (dataContext) {
                        var userDataContextRef = userDataContextsRef.push();
                        userDataContextRef.set(JSON.stringify(dataContext));
                        dataContextMap[userDataContextRef.key] = dataContext.title || dataContext.name;
                    });
                    callback(error, dataContextMap);
                });
            });
        });
    };
    IFrameSidebar.prototype.onPublish = function (e) {
        var _this = this;
        e.preventDefault();
        if (!this.props.initInteractiveData) {
            return;
        }
        this.setState({
            publishing: true,
            publishingStatus: "Publishing..."
        });
        var data = this.props.initInteractiveData;
        var classroomKey = "classes/" + this.state.classHash;
        var safeUserKey = escape_firebase_key_1.default(data.authInfo.email);
        var interactiveKey = classroomKey + "/interactives/interactive_" + data.interactive.id;
        var userInteractivesKey = classroomKey + "/users/" + safeUserKey + "/interactives/interactive_" + data.interactive.id;
        var userDataContextsKey = "dataContexts/" + this.state.classHash + "/" + safeUserKey + "/interactive_" + data.interactive.id;
        superagent
            .post(this.props.copyUrl)
            .set('Accept', 'application/json')
            .end(function (err, res) {
            _this.setState({
                publishingError: null,
                publishing: false
            });
            if (!err && _this.props.authoredState) {
                try {
                    var copyResults = JSON.parse(res.text);
                    if (copyResults && copyResults.id && copyResults.readAccessKey) {
                        var laraParams = {
                            recordid: copyResults.id,
                            accessKeys: {
                                readOnly: copyResults.readAccessKey
                            }
                        };
                        var documentUrl_1 = _this.props.authoredState.codapUrl + "?#file=lara:" + base64url.encode(JSON.stringify(laraParams));
                        _this.saveDataContexts(userDataContextsKey, function (err, dataContexts) {
                            if (err) {
                                throw err;
                            }
                            // save the interactive name (noop after it is first set)
                            var firebaseInteractive = { name: data.interactive.name };
                            _this.interactiveRef = _this.interactiveRef || firebase.database().ref(interactiveKey);
                            _this.interactiveRef.set(firebaseInteractive);
                            // push the copy
                            _this.userInteractivesRef = _this.userInteractivesRef || firebase.database().ref(userInteractivesKey);
                            var userInteractive = {
                                createdAt: firebase.database.ServerValue.TIMESTAMP,
                                documentUrl: documentUrl_1,
                                dataContexts: dataContexts || {}
                            };
                            _this.userInteractivesRef.push().set(userInteractive);
                            _this.setState({
                                publishing: false,
                                publishingStatus: "Published!"
                            });
                            var clearPublishingStatus = function () {
                                _this.setState({
                                    publishingStatus: null
                                });
                            };
                            setTimeout(clearPublishingStatus, 2000);
                        });
                    }
                    else {
                        err = "Invalid response from copy document call";
                    }
                }
                catch (e) {
                    err = e;
                }
            }
            if (err) {
                _this.setState({ publishingError: err });
            }
        });
    };
    IFrameSidebar.prototype.renderPublishingError = function () {
        if (!this.state.publishingError) {
            return null;
        }
        return React.createElement("div", { className: "error" }, this.state.publishingError);
    };
    IFrameSidebar.prototype.renderPublishingStatus = function () {
        if (!this.state.publishingStatus) {
            return null;
        }
        return React.createElement("div", { className: "status" }, this.state.publishingStatus);
    };
    IFrameSidebar.prototype.renderUserInteractives = function () {
        var _this = this;
        if ((this.state.classHash === null) || (this.state.userInteractives.length === 0)) {
            return null;
        }
        return (React.createElement("div", { className: "user-interactive-list" }, this.state.userInteractives.map(function (userInteractives) {
            return (React.createElement(UserInteractives, { key: userInteractives.email, userInteractives: userInteractives, classHash: _this.state.classHash || "", interactiveId: _this.props.initInteractiveData.interactive.id, email: userInteractives.email, codapPhone: _this.props.codapPhone, initInteractiveData: _this.props.initInteractiveData, myEmail: _this.state.myEmail, classInfo: _this.classInfo }));
        })));
    };
    IFrameSidebar.prototype.renderUsernameHeader = function () {
        var me = this.classInfo.getUserName(this.state.myEmail);
        var username = me.found ? me.name : null;
        if (!username) {
            return null;
        }
        return React.createElement("div", { className: "username-header" }, username);
    };
    IFrameSidebar.prototype.render = function () {
        if (this.state.error) {
            return React.createElement("div", { id: "iframe-sidebar" }, this.state.error);
        }
        if (!this.state.classHash || !this.props.codapPhone) {
            return null;
        }
        // const href = `../dashboard/?class=${base64url.encode(this.props.initInteractiveData.classInfoUrl)}`
        //            <a className="button button-primary" href={href} target="_blank">View</a>
        return React.createElement("div", { id: "iframe-sidebar" },
            this.renderUsernameHeader(),
            React.createElement("div", { className: "buttons" },
                React.createElement("button", { className: "button button-primary", onClick: this.onPublish, disabled: this.state.publishing }, "Publish")),
            this.renderPublishingError(),
            this.renderPublishingStatus(),
            this.renderUserInteractives());
    };
    return IFrameSidebar;
}(React.Component));
exports.IFrameSidebar = IFrameSidebar;


/***/ })

},[204]);
//# sourceMappingURL=iframe.js.map