webpackJsonp([0],{

/***/ 202:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var React = __webpack_require__(7);
var ReactDOM = __webpack_require__(15);
var app_1 = __webpack_require__(91);
ReactDOM.render(React.createElement(app_1.App, null), document.getElementById("app"));


/***/ }),

/***/ 63:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var agoUnits = [
    { max: 2760000, value: 60000, name: 'minute', prev: 'a minute ago' },
    { max: 72000000, value: 3600000, name: 'hour', prev: 'an hour ago' },
    { max: 518400000, value: 86400000, name: 'day', prev: 'yesterday' },
    { max: 2419200000, value: 604800000, name: 'week', prev: 'last week' },
    { max: 28512000000, value: 2592000000, name: 'month', prev: 'last month' },
    { max: Infinity, value: 31536000000, name: 'year', prev: 'last year' }
];
function ago(timestamp) {
    var diff = Math.abs(Date.now() - timestamp);
    if (diff < 60000) {
        return 'just now';
    }
    for (var i = 0; i < agoUnits.length; i++) {
        if (diff < agoUnits[i].max) {
            var val = Math.floor(diff / agoUnits[i].value);
            return val <= 1 ? agoUnits[i].prev : val + " " + agoUnits[i].name + "s ago";
        }
    }
}
exports.ago = ago;


/***/ }),

/***/ 91:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var user_page_1 = __webpack_require__(93);
var classroom_page_1 = __webpack_require__(92);
var class_info_1 = __webpack_require__(38);
var superagent = __webpack_require__(20);
var base64url = __webpack_require__(24);
var queryString = __webpack_require__(16);
var App = (function (_super) {
    __extends(App, _super);
    function App(props) {
        var _this = _super.call(this, props) || this;
        _this.setUserInteractive = _this.setUserInteractive.bind(_this);
        _this.getInteractiveHref = _this.getInteractiveHref.bind(_this);
        _this.state = {
            class: null,
            className: null,
            loading: true,
            error: null,
            userInteractive: null,
            user: null,
            interactives: [],
            users: [],
            activity: [],
            firebaseData: null
        };
        return _this;
    }
    App.prototype.componentWillMount = function () {
        var query = queryString.parse(location.search);
        if (!query.class && !(query.offering && query.token)) {
            return this.setState({ error: "Missing class or offering and token in query string" });
        }
        this.setState({
            loading: true,
            class: query.class
        });
        if (query.offering) {
            this.loadOfferingInfo(query.offering, query.token);
        }
        else {
            this.loadClassInfo(base64url.decode(query.class));
        }
    };
    App.prototype.loadOfferingInfo = function (offeringUrl, token) {
        var _this = this;
        var match = offeringUrl.match(/\/(offerings\/(\d+)\/for_class)$/);
        if (match) {
            var _ = match[0], apiPath_1 = match[1], offeringId = match[2];
            superagent
                .get(offeringUrl)
                .set({ 'Authorization': "Bearer " + token })
                .end(function (err, res) {
                if (res.ok) {
                    if ((res.body.length > 0) && res.body[0].clazz_id) {
                        var clazz = offeringUrl.replace(apiPath_1, "classes/" + res.body[0].clazz_id);
                        _this.setState({ class: base64url.encode(clazz) });
                        _this.loadClassInfo(clazz);
                    }
                    else {
                        return _this.setState({ error: "No classes found for offering in query string" });
                    }
                }
                else {
                    _this.setState({ error: "Unable to load offering in query string" });
                }
            });
        }
        else {
            this.setState({ error: "Invalid offering url in query string, must be /for_class" });
        }
    };
    App.prototype.loadClassInfo = function (classInfoUrl) {
        var _this = this;
        var firstLoad = true;
        var query = queryString.parse(location.search);
        this.classInfo = new class_info_1.ClassInfo(classInfoUrl);
        this.classInfo.getClassInfo(function (err, info) {
            if (err) {
                _this.setState({
                    loading: false,
                    error: err
                });
                return;
            }
            _this.setState({ className: info.name });
            // connect to firebase
            _this.classroomRef = firebase.database().ref("classes/" + info.classHash);
            _this.classroomRef.on("value", function (snapshot) {
                var interactives = [];
                var users = [];
                var activity = [];
                var firebaseData = snapshot.val();
                var user = null;
                var userInteractive = null;
                var error = null;
                var createdAt = null;
                var interactiveMap = {};
                var userMap = {};
                var userNamesNotFound = false;
                if (firebaseData) {
                    if (firebaseData.interactives) {
                        Object.keys(firebaseData.interactives).forEach(function (firebaseInteractiveId) {
                            var firebaseInteractive = firebaseData.interactives[firebaseInteractiveId];
                            var interactive = {
                                id: firebaseInteractiveId,
                                name: firebaseInteractive.name,
                                users: {}
                            };
                            interactives.push(interactive);
                            interactiveMap[firebaseInteractiveId] = interactive;
                        });
                    }
                    if (firebaseData.users) {
                        Object.keys(firebaseData.users).forEach(function (firebaseUserId) {
                            var firebaseUser = firebaseData.users[firebaseUserId];
                            var userName = _this.classInfo.getUserName(firebaseUserId);
                            var user = {
                                id: firebaseUserId,
                                name: userName.name,
                                interactives: {}
                            };
                            if (!userName.found) {
                                userNamesNotFound = true;
                            }
                            if (firebaseUser.interactives) {
                                Object.keys(firebaseUser.interactives).forEach(function (firebaseInteractiveId) {
                                    var interactive = interactiveMap[firebaseInteractiveId];
                                    if (interactive) {
                                        var userInteractives_1 = user.interactives[firebaseInteractiveId] = user.interactives[firebaseInteractiveId] || [];
                                        var firebaseUserInteractives_1 = firebaseUser.interactives[firebaseInteractiveId];
                                        Object.keys(firebaseUserInteractives_1).forEach(function (firebaseUserInteractiveId) {
                                            var firebaseUserInteractive = firebaseUserInteractives_1[firebaseUserInteractiveId];
                                            var userInteractive = {
                                                id: firebaseInteractiveId,
                                                name: interactive.name,
                                                url: firebaseUserInteractive.documentUrl,
                                                createdAt: firebaseUserInteractive.createdAt
                                            };
                                            userInteractives_1.push(userInteractive);
                                            activity.push({
                                                user: user,
                                                userInteractive: userInteractive
                                            });
                                        });
                                        userInteractives_1.sort(function (a, b) { return b.createdAt - a.createdAt; });
                                    }
                                });
                            }
                            users.push(user);
                            userMap[firebaseUserId] = user;
                        });
                    }
                    users.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
                    interactives.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
                    activity.sort(function (a, b) { return b.userInteractive.createdAt - a.userInteractive.createdAt; });
                    users.forEach(function (user) {
                        Object.keys(user.interactives).forEach(function (interactiveId) {
                            var interactive = interactiveMap[interactiveId];
                            if (interactive) {
                                interactive.users[user.id] = user;
                            }
                        });
                    });
                    if (firstLoad) {
                        window.addEventListener("popstate", function (e) {
                            var state = e.state || {};
                            var user = state.user || null;
                            var interactive = state.interactive || null;
                            _this.setState({ userInteractive: state.userInteractive || null, user: state.user || null });
                        });
                        if (query.interactive && query.user) {
                            user = userMap[query.user];
                            var interactiveKey = "interactive_" + query.interactive;
                            var interactive = interactiveMap[interactiveKey];
                            if (user && interactive) {
                                var userInteractives = user.interactives[interactive.id];
                                if (userInteractives) {
                                    if (query.createdAt) {
                                        createdAt = parseInt(query.createdAt, 10);
                                        userInteractives = userInteractives.filter(function (userInteractive) { return userInteractive.createdAt === createdAt; });
                                    }
                                    userInteractive = userInteractives[0] || null;
                                }
                            }
                            if (!user || !userInteractive) {
                                error = "Sorry, the requested user interactive was not found!";
                            }
                        }
                        firstLoad = false;
                    }
                }
                else {
                    error = "No interactives have been shared yet for this classroom";
                }
                _this.setState({
                    loading: false,
                    error: error,
                    interactives: interactives,
                    users: users,
                    activity: activity,
                    user: user || _this.state.user,
                    userInteractive: userInteractive || _this.state.userInteractive,
                    firebaseData: firebaseData
                });
                if (userNamesNotFound) {
                    _this.classInfo.getStudentNames(function (err, names) {
                        if (err) {
                            _this.setState({ error: err });
                            return;
                        }
                        _this.setState({
                            users: users.map(function (user) {
                                if (names[user.id] !== undefined) {
                                    user.name = names[user.id];
                                }
                                return user;
                            })
                        });
                    });
                }
            });
        });
    };
    App.prototype.componentWillUnmount = function () {
        if (this.classroomRef) {
            this.classroomRef.off();
        }
    };
    App.prototype.onClassroomClick = function () {
        if (history.pushState && this.state.class) {
            history.pushState({}, "", location.pathname + "?class=" + this.state.class);
        }
        this.setState({ userInteractive: null, user: null });
    };
    App.prototype.renderNav = function () {
        if (this.state.class !== null) {
            var showClassroomButton = (this.state.user !== null) && (this.state.userInteractive !== null);
            return React.createElement("div", { className: "nav" },
                this.state.className !== null ? React.createElement("h3", null, this.state.className) : null,
                showClassroomButton ? React.createElement("button", { key: "classroom", className: "button button-primary", onClick: this.onClassroomClick.bind(this) }, "View All") : null);
        }
        return null;
    };
    App.prototype.getInteractiveHref = function (user, userInteractive) {
        return location.pathname + "?class=" + this.state.class + "&interactive=" + userInteractive.id.split("_")[1] + "&user=" + user.id + "&createdAt=" + userInteractive.createdAt;
    };
    App.prototype.setUserInteractive = function (user, userInteractive) {
        if (history.pushState) {
            var href = this.getInteractiveHref(user, userInteractive);
            history.pushState({ user: user, userInteractive: userInteractive }, "", href);
        }
        this.setState({
            user: user,
            userInteractive: userInteractive
        });
    };
    App.prototype.renderPage = function () {
        if (this.state.class !== null) {
            if ((this.state.userInteractive !== null) && (this.state.user !== null)) {
                return React.createElement(user_page_1.UserPage, { userInteractive: this.state.userInteractive, user: this.state.user, setUserInteractive: this.setUserInteractive, getInteractiveHref: this.getInteractiveHref, classInfo: this.classInfo });
            }
            return React.createElement(classroom_page_1.ClassroomPage, { class: this.state.class, interactives: this.state.interactives, users: this.state.users, activity: this.state.activity, setUserInteractive: this.setUserInteractive, getInteractiveHref: this.getInteractiveHref, classInfo: this.classInfo });
        }
        return null;
    };
    App.prototype.render = function () {
        return React.createElement("div", { className: "container" },
            React.createElement("div", { className: "row" },
                React.createElement("div", { className: "twelve columns" },
                    React.createElement("div", { className: "header" },
                        React.createElement("img", { src: "../assets/img/concord.png" }),
                        " Classroom Sharing"),
                    this.renderNav(),
                    !this.state.error && this.state.loading ? React.createElement("div", { className: "section loading" },
                        React.createElement("img", { src: "../assets/img/loading.gif" }),
                        " Loading...") : null,
                    this.state.error ? React.createElement("div", { className: "section error" }, this.state.error) : null,
                    this.state.firebaseData ? this.renderPage() : null)));
    };
    return App;
}(React.Component));
exports.App = App;


/***/ }),

/***/ 92:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var ago_1 = __webpack_require__(63);
var ClassroomPage = (function (_super) {
    __extends(ClassroomPage, _super);
    function ClassroomPage(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            currentTab: "users"
        };
        return _this;
    }
    ClassroomPage.prototype.createOnClick = function (href, user, userInteractive) {
        var _this = this;
        return function (e) {
            e.preventDefault();
            _this.props.setUserInteractive(user, userInteractive);
        };
    };
    ClassroomPage.prototype.renderUser = function (user) {
        var _this = this;
        var interactives = Object.keys(user.interactives).map(function (interactiveId) {
            var userInteractives = user.interactives[interactiveId];
            var userInteractive = userInteractives[0];
            var key = user.id + "-" + interactiveId;
            var href = _this.props.getInteractiveHref(user, userInteractive);
            var onClick = _this.createOnClick(href, user, userInteractive);
            return React.createElement("span", { key: key },
                React.createElement("a", { href: href, onClick: onClick }, userInteractive.name),
                " (",
                userInteractives.length,
                ")");
        });
        return React.createElement("tr", { key: user.id },
            React.createElement("td", null, user.name),
            React.createElement("td", null, interactives));
    };
    ClassroomPage.prototype.renderInteractive = function (interactive) {
        var _this = this;
        var users = Object.keys(interactive.users).map(function (userId) {
            var user = interactive.users[userId];
            var userInteractives = user.interactives[interactive.id];
            var userInteractive = userInteractives[0];
            var key = user.id + "-" + interactive.id;
            var href = _this.props.getInteractiveHref(user, userInteractive);
            var onClick = _this.createOnClick(href, user, userInteractive);
            return React.createElement("span", { key: key },
                React.createElement("a", { href: href, onClick: onClick }, user.name),
                " (",
                userInteractives.length,
                ")");
        });
        return React.createElement("tr", { key: interactive.id },
            React.createElement("td", null, interactive.name),
            React.createElement("td", null, users));
    };
    ClassroomPage.prototype.renderUsers = function () {
        if (this.props.users.length === 0) {
            return React.createElement("div", null, "No teachers or students have published any interactives yet");
        }
        return React.createElement("table", { className: "u-full-width" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "User"),
                    React.createElement("th", null, "Published Interactives"))),
            React.createElement("tbody", null, this.props.users.map(this.renderUser.bind(this))));
    };
    ClassroomPage.prototype.renderInteractives = function () {
        if (this.props.interactives.length === 0) {
            return React.createElement("div", null, "No interactives have been published yet");
        }
        return React.createElement("table", { className: "u-full-width" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "Published Interactive"),
                    React.createElement("th", null, "Users"))),
            React.createElement("tbody", null, this.props.interactives.map(this.renderInteractive.bind(this))));
    };
    ClassroomPage.prototype.renderActivity = function (activity, index) {
        var href = this.props.getInteractiveHref(activity.user, activity.userInteractive);
        var onClick = this.createOnClick(href, activity.user, activity.userInteractive);
        return React.createElement("div", { className: "activity", key: activity.user.id + "-" + activity.userInteractive.id + "-" + index },
            activity.user.name,
            " published",
            React.createElement("a", { href: href, onClick: onClick }, activity.userInteractive.name),
            ago_1.ago(activity.userInteractive.createdAt));
    };
    ClassroomPage.prototype.renderActivityList = function () {
        if (this.props.activity.length === 0) {
            return React.createElement("div", null, "There has been no activity in this classroom yet");
        }
        return React.createElement("div", { className: "activity-list" }, this.props.activity.map(this.renderActivity.bind(this)));
    };
    ClassroomPage.prototype.renderTabs = function () {
        var _this = this;
        var selectTab = function (tab) {
            return function () {
                _this.setState({ currentTab: tab });
            };
        };
        return React.createElement("ul", { className: "tab" },
            React.createElement("li", { className: this.state.currentTab === "users" ? "active" : "" },
                React.createElement("span", { onClick: selectTab("users") }, "Users")),
            React.createElement("li", { className: this.state.currentTab === "interactives" ? "active" : "" },
                React.createElement("span", { onClick: selectTab("interactives") }, "Interactives")),
            React.createElement("li", { className: this.state.currentTab === "activity" ? "active" : "" },
                React.createElement("span", { onClick: selectTab("activity") }, "Activity")));
    };
    ClassroomPage.prototype.renderCurrentTab = function () {
        switch (this.state.currentTab) {
            case "users":
                return this.renderUsers();
            case "interactives":
                return this.renderInteractives();
            case "activity":
                return this.renderActivityList();
        }
    };
    ClassroomPage.prototype.render = function () {
        return React.createElement("div", { className: "page" },
            this.renderTabs(),
            this.renderCurrentTab());
    };
    return ClassroomPage;
}(React.Component));
exports.ClassroomPage = ClassroomPage;


/***/ }),

/***/ 93:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(7);
var ago_1 = __webpack_require__(63);
var UserPage = (function (_super) {
    __extends(UserPage, _super);
    function UserPage(props) {
        var _this = _super.call(this, props) || this;
        _this.versionSelected = _this.versionSelected.bind(_this);
        _this.state = {
            currentInteractiveCount: 0
        };
        return _this;
    }
    UserPage.prototype.componentDidMount = function () {
        // TODO: resize iframe
    };
    UserPage.prototype.componentWillReceiveProps = function (nextProps) {
        // check if the student added a version
        if (nextProps.user.id === this.props.user.id) {
            var nextInteractives = nextProps.user.interactives[this.props.userInteractive.id];
            var currentInteractives = this.props.user.interactives[this.props.userInteractive.id];
            if (nextInteractives.length > currentInteractives.length) {
            }
        }
    };
    UserPage.prototype.versionSelected = function (e) {
        e.preventDefault();
        var value = parseInt(e.currentTarget.value, 10);
        var interactives = this.props.user.interactives[this.props.userInteractive.id];
        var interactive = interactives.filter(function (interactive) { return interactive.createdAt === value; })[0];
        if (interactive) {
            this.props.setUserInteractive(this.props.user, interactive);
        }
    };
    UserPage.prototype.renderDropdown = function () {
        var interactives = this.props.user.interactives[this.props.userInteractive.id];
        if (interactives.length < 2) {
            return null;
        }
        var options = interactives.map(function (interactive, index) {
            var number = interactives.length - index;
            return React.createElement("option", { key: index, value: interactive.createdAt },
                "Version #",
                number,
                ", published ",
                ago_1.ago(interactive.createdAt));
        });
        return React.createElement("div", null,
            React.createElement("select", { ref: "createdAtSelect", onChange: this.versionSelected, value: this.props.userInteractive.createdAt }, options));
    };
    UserPage.prototype.render = function () {
        return React.createElement("div", { className: "page" },
            React.createElement("div", { className: "page-header" },
                React.createElement("h4", null,
                    this.props.user.name,
                    ": ",
                    this.props.userInteractive.name),
                this.renderDropdown()),
            React.createElement("div", { id: "iframe", className: "u-full-width" },
                React.createElement("iframe", { className: "u-full-width", src: this.props.userInteractive.url })));
    };
    return UserPage;
}(React.Component));
exports.UserPage = UserPage;


/***/ })

},[202]);
//# sourceMappingURL=app.js.map