webpackJsonp([1],{

/***/ 204:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var React = __webpack_require__(9);
var ReactDOM = __webpack_require__(21);
var iframe_1 = __webpack_require__(89);
ReactDOM.render(React.createElement(iframe_1.IFrame, null), document.getElementById("app"));


/***/ }),

/***/ 89:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(9);
var iframe_overlay_1 = __webpack_require__(60);
var queryString = __webpack_require__(35);
var superagent = __webpack_require__(56);
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
        var url = this.refs.laraSharedUrl.value;
        var _a = url.split("?"), docStoreUrl = _a[0], query = _a[1], rest = _a.slice(2);
        var urlMatches = docStoreUrl.match(/^((https?:\/\/[^/]+\/)v2\/documents\/\d+\/(auto)?launch)/);
        var launchParams = queryString.parse(query || "");
        if (!urlMatches || !launchParams.server) {
            this.setState({ authoringError: "This URL does not appear to be a shared URL from the LARA tab in CODAP" });
            return;
        }
        this.setState({ authoringError: null });
        docStoreUrl = this.matchProtocol(urlMatches[2].replace(/\/+$/, "")); // remove trailing slashes
        var codapUrl;
        _b = launchParams.server.split("?"), codapUrl = _b[0], query = _b[1], rest = _b.slice(2);
        var codapParams = queryString.parse(query || "");
        codapParams.componentMode = "yes";
        codapParams.documentServer = docStoreUrl;
        codapParams.saveSecondaryFileViaPostMessage = "yes";
        codapUrl = this.matchProtocol(codapUrl + "?" + queryString.stringify(codapParams));
        var authoredState = {
            laraSharedUrl: url,
            docStoreUrl: codapParams.documentServer,
            autoLaunchUrl: this.matchProtocol(urlMatches[1].replace("/launch", "/autolaunch")),
            codapUrl: codapUrl
        };
        this.clientPhone.post('authoredState', authoredState);
        var _b;
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


/***/ })

},[204]);
//# sourceMappingURL=iframe.js.map