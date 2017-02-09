webpackJsonp([1],{

/***/ 201:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var React = __webpack_require__(10);
var ReactDOM = __webpack_require__(21);
var iframe_1 = __webpack_require__(87);
ReactDOM.render(React.createElement(iframe_1.IFrame, null), document.getElementById("app"));


/***/ }),

/***/ 87:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(10);
var iframe_overlay_1 = __webpack_require__(90);
var queryString = __webpack_require__(34);
var superagent = __webpack_require__(55);
var IFrame = (function (_super) {
    __extends(IFrame, _super);
    function IFrame(props) {
        var _this = _super.call(this, props) || this;
        _this.submitAuthoringInfo = _this.submitAuthoringInfo.bind(_this);
        _this.getInteractiveState = _this.getInteractiveState.bind(_this);
        _this.delayedMount = _this.delayedMount.bind(_this);
        _this.state = {
            irsUrl: null,
            src: null,
            authoring: false,
            authoredState: null,
            authoringError: null,
            initInteractiveData: null,
            copyUrl: null
        };
        return _this;
    }
    IFrame.prototype.componentDidMount = function () {
        // TODO: figure out why iframe phone needs the delay
        setTimeout(this.delayedMount, 1000);
    };
    IFrame.prototype.delayedMount = function () {
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
            var serverParams = {
                componentMode: "yes",
                documentServer: authoredState.docStoreUrl
            };
            var srcParams = {
                server: authoredState.codapUrl + "?" + queryString.stringify(serverParams)
            };
            var src = authoredState.autoLaunchUrl + "?" + queryString.stringify(srcParams);
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
        this.clientPhone.initialize();
        this.clientPhone.post('supportedFeatures', {
            apiVersion: 1,
            features: {
                authoredState: true
            }
        });
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
        }
    };
    IFrame.prototype.getInteractiveState = function () {
        var _this = this;
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
                            _this.setState({
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
        var url = this.refs.laraSharedUrl.value;
        var _a = url.split("?"), docStoreUrl = _a[0], query = _a[1], rest = _a.slice(2);
        var urlMatches = docStoreUrl.match(/^((https?:\/\/[^/]+\/)v2\/documents\/\d+\/(auto)?launch)/);
        var launchParams = queryString.parse(query || "");
        if (!urlMatches || !launchParams.server) {
            this.setState({ authoringError: "This URL does not appear to be a shared URL from the LARA tab in CODAP" });
            return;
        }
        this.setState({ authoringError: null });
        var authoredState = {
            laraSharedUrl: url,
            docStoreUrl: this.matchProtocol(urlMatches[2].replace(/\/+$/, "")),
            autoLaunchUrl: this.matchProtocol(urlMatches[1].replace("/launch", "/autolaunch")),
            codapUrl: this.matchProtocol(launchParams.server)
        };
        this.clientPhone.post('authoredState', authoredState);
    };
    IFrame.prototype.matchProtocol = function (url) {
        var a = document.createElement("a");
        a.href = url;
        a.protocol = location.protocol;
        return a.href;
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
        if (this.state.src && this.state.initInteractiveData && this.state.authoredState) {
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


/***/ }),

/***/ 90:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(10);
var escape_firebase_key_1 = __webpack_require__(57);
var queryString = __webpack_require__(34);
var base64url = __webpack_require__(58);
var superagent = __webpack_require__(55);
var IFrameOverlay = (function (_super) {
    __extends(IFrameOverlay, _super);
    function IFrameOverlay(props) {
        var _this = _super.call(this, props) || this;
        _this.onPublish = _this.onPublish.bind(_this);
        _this.state = {
            privateClassHash: null,
            loadingClassInfo: false,
            publishing: false,
            publishingError: null,
            publishingStatus: null
        };
        return _this;
    }
    IFrameOverlay.prototype.componentDidMount = function () {
        var _this = this;
        if (!this.state.privateClassHash && !this.state.loadingClassInfo) {
            this.setState({ loadingClassInfo: true });
            superagent
                .get(this.props.initInteractiveData.classInfoUrl)
                .withCredentials()
                .set('Accept', 'application/json')
                .end(function (err, res) {
                if (!err) {
                    try {
                        var result = JSON.parse(res.text);
                        if (result.response_type !== "ERROR") {
                            _this.setState({
                                loadingClassInfo: false,
                                privateClassHash: result.private_class_hash
                            });
                        }
                    }
                    catch (e) { }
                }
            });
        }
    };
    IFrameOverlay.prototype.onPublish = function (e) {
        var _this = this;
        e.preventDefault();
        this.setState({
            publishing: true,
            publishingStatus: "Publishing..."
        });
        var data = this.props.initInteractiveData;
        var classroomKey = "classes/" + this.state.privateClassHash;
        var interactiveKey = classroomKey + "/interactives/interactive_" + data.interactive.id;
        var studentInteractivesKey = classroomKey + "/students/" + escape_firebase_key_1.default(data.authInfo.email) + "/interactives/interactive_" + data.interactive.id;
        superagent
            .post(this.props.copyUrl)
            .set('Accept', 'application/json')
            .end(function (err, res) {
            _this.setState({ publishing: false });
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
                        var codapParams = {
                            componentMode: "yes",
                            documentServer: _this.props.authoredState.docStoreUrl
                        };
                        var url = _this.props.authoredState.codapUrl + "?" + queryString.stringify(codapParams) + "#file=lara:" + base64url.encode(JSON.stringify(laraParams));
                        // save the interactive name (noop after it is first set)
                        var firebaseInteractive = { name: data.interactive.name };
                        _this.interactiveRef = _this.interactiveRef || firebase.database().ref(interactiveKey);
                        _this.interactiveRef.set(firebaseInteractive);
                        // push the copy
                        _this.studentInteractivesRef = _this.studentInteractivesRef || firebase.database().ref(studentInteractivesKey);
                        _this.studentInteractivesRef.push().set({
                            url: url,
                            createdAt: firebase.database.ServerValue.TIMESTAMP
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
            _this.setState({
                publishingError: err ? err.toString() : null,
                publishingStatus: !err ? "Published!" : null
            });
            if (!err) {
                var clearPublishingStatus = function () {
                    _this.setState({
                        publishingStatus: null
                    });
                };
                setTimeout(clearPublishingStatus, 2000);
            }
        });
    };
    IFrameOverlay.prototype.renderPublishingError = function () {
        if (!this.state.publishingError) {
            return null;
        }
        return React.createElement("div", { className: "error" }, this.state.publishingError);
    };
    IFrameOverlay.prototype.renderPublishingStatus = function () {
        if (!this.state.publishingStatus) {
            return null;
        }
        return React.createElement("div", { className: "status" }, this.state.publishingStatus);
    };
    IFrameOverlay.prototype.render = function () {
        if (!this.props.initInteractiveData || !this.state.privateClassHash) {
            return null;
        }
        var href = "../dashboard/?class=" + base64url.encode(this.props.initInteractiveData.classInfoUrl);
        return React.createElement("div", { id: "iframe-overlay" },
            React.createElement("div", { id: "background" }),
            React.createElement("div", { id: "buttons" },
                React.createElement("button", { className: "button button-primary", onClick: this.onPublish, disabled: this.state.publishing }, "Publish"),
                React.createElement("a", { className: "button button-primary", href: href, target: "_blank" }, "View")),
            this.renderPublishingError(),
            this.renderPublishingStatus());
    };
    return IFrameOverlay;
}(React.Component));
exports.IFrameOverlay = IFrameOverlay;


/***/ })

},[201]);
//# sourceMappingURL=iframe.js.map