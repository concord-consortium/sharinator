webpackJsonp([0],{

/***/ 200:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var React = __webpack_require__(10);
var ReactDOM = __webpack_require__(21);
var app_1 = __webpack_require__(86);
ReactDOM.render(React.createElement(app_1.App, null), document.getElementById("app"));


/***/ }),

/***/ 203:
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

/***/ 86:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(10);
var student_page_1 = __webpack_require__(91);
var classroom_page_1 = __webpack_require__(89);
var class_info_1 = __webpack_require__(88);
var base64url = __webpack_require__(58);
var queryString = __webpack_require__(34);
var App = (function (_super) {
    __extends(App, _super);
    function App(props) {
        var _this = _super.call(this, props) || this;
        _this.setStudentInteractive = _this.setStudentInteractive.bind(_this);
        _this.getInteractiveHref = _this.getInteractiveHref.bind(_this);
        _this.state = {
            class: null,
            className: null,
            loading: true,
            error: null,
            studentInteractive: null,
            student: null,
            interactives: [],
            students: [],
            activity: [],
            firebaseData: null
        };
        return _this;
    }
    App.prototype.componentWillMount = function () {
        var _this = this;
        var query = queryString.parse(location.search);
        var firstLoad = true;
        if (!query.class) {
            return this.setState({ error: "Missing class in query string" });
        }
        this.setState({ loading: true, class: query.class });
        this.classInfo = new class_info_1.ClassInfo(base64url.decode(query.class));
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
            _this.classroomRef = firebase.database().ref("classes/" + info.privateClassHash);
            _this.classroomRef.on("value", function (snapshot) {
                var interactives = [];
                var students = [];
                var activity = [];
                var firebaseData = snapshot.val();
                var student = null;
                var studentInteractive = null;
                var error = null;
                var createdAt = null;
                var interactiveMap = {};
                var studentMap = {};
                var studentNamesNotFound = false;
                if (firebaseData) {
                    if (firebaseData.interactives) {
                        Object.keys(firebaseData.interactives).forEach(function (firebaseInteractiveId) {
                            var firebaseInteractive = firebaseData.interactives[firebaseInteractiveId];
                            var interactive = {
                                id: firebaseInteractiveId,
                                name: firebaseInteractive.name,
                                students: {}
                            };
                            interactives.push(interactive);
                            interactiveMap[firebaseInteractiveId] = interactive;
                        });
                    }
                    if (firebaseData.students) {
                        Object.keys(firebaseData.students).forEach(function (firebaseStudentId) {
                            var firebaseStudent = firebaseData.students[firebaseStudentId];
                            var studentName = _this.classInfo.getStudentName(firebaseStudentId);
                            var student = {
                                id: firebaseStudentId,
                                name: studentName.name,
                                interactives: {}
                            };
                            if (!studentName.found) {
                                studentNamesNotFound = true;
                            }
                            if (firebaseStudent.interactives) {
                                Object.keys(firebaseStudent.interactives).forEach(function (firebaseInteractiveId) {
                                    var interactive = interactiveMap[firebaseInteractiveId];
                                    if (interactive) {
                                        var studentInteractives_1 = student.interactives[firebaseInteractiveId] = student.interactives[firebaseInteractiveId] || [];
                                        var firebaseStudentInteractives_1 = firebaseStudent.interactives[firebaseInteractiveId];
                                        Object.keys(firebaseStudentInteractives_1).forEach(function (firebaseStudentInteractiveId) {
                                            var firebaseStudentInteractive = firebaseStudentInteractives_1[firebaseStudentInteractiveId];
                                            var studentInteractive = {
                                                id: firebaseInteractiveId,
                                                name: interactive.name,
                                                url: firebaseStudentInteractive.url,
                                                createdAt: firebaseStudentInteractive.createdAt
                                            };
                                            studentInteractives_1.push(studentInteractive);
                                            activity.push({
                                                student: student,
                                                studentInteractive: studentInteractive
                                            });
                                        });
                                        studentInteractives_1.sort(function (a, b) { return b.createdAt - a.createdAt; });
                                    }
                                });
                            }
                            students.push(student);
                            studentMap[firebaseStudentId] = student;
                        });
                    }
                    students.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
                    interactives.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
                    activity.sort(function (a, b) { return b.studentInteractive.createdAt - a.studentInteractive.createdAt; });
                    students.forEach(function (student) {
                        Object.keys(student.interactives).forEach(function (interactiveId) {
                            var interactive = interactiveMap[interactiveId];
                            if (interactive) {
                                interactive.students[student.id] = student;
                            }
                        });
                    });
                    if (firstLoad) {
                        window.addEventListener("popstate", function (e) {
                            var state = e.state || {};
                            var student = state.student || null;
                            var interactive = state.interactive || null;
                            _this.setState({ studentInteractive: state.studentInteractive || null, student: state.student || null });
                        });
                        if (query.interactive && query.student) {
                            student = studentMap[query.student];
                            var interactiveKey = "interactive_" + query.interactive;
                            var interactive = interactiveMap[interactiveKey];
                            if (student && interactive) {
                                var studentInteractives = student.interactives[interactive.id];
                                if (studentInteractives) {
                                    if (query.createdAt) {
                                        createdAt = parseInt(query.createdAt, 10);
                                        studentInteractives = studentInteractives.filter(function (studentInteractive) { return studentInteractive.createdAt === createdAt; });
                                    }
                                    studentInteractive = studentInteractives[0] || null;
                                }
                            }
                            if (!student || !studentInteractive) {
                                error = "Sorry, the requested student interactive was not found!";
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
                    students: students,
                    activity: activity,
                    student: student || _this.state.student,
                    studentInteractive: studentInteractive || _this.state.studentInteractive,
                    firebaseData: firebaseData
                });
                if (studentNamesNotFound) {
                    _this.classInfo.getStudentNames(function (err, names) {
                        if (err) {
                            _this.setState({ error: err });
                            return;
                        }
                        _this.setState({
                            students: students.map(function (student) {
                                if (names[student.id] !== undefined) {
                                    student.name = names[student.id];
                                }
                                return student;
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
        this.setState({ studentInteractive: null, student: null });
    };
    App.prototype.renderNav = function () {
        if (this.state.class !== null) {
            var showClassroomButton = (this.state.student !== null) && (this.state.studentInteractive !== null);
            return React.createElement("div", { className: "nav" },
                this.state.className !== null ? React.createElement("h3", null, this.state.className) : null,
                showClassroomButton ? React.createElement("button", { key: "classroom", className: "button button-primary", onClick: this.onClassroomClick.bind(this) }, "View All") : null);
        }
        return null;
    };
    App.prototype.getInteractiveHref = function (student, studentInteractive) {
        return location.pathname + "?class=" + this.state.class + "&interactive=" + studentInteractive.id.split("_")[1] + "&student=" + student.id + "&createdAt=" + studentInteractive.createdAt;
    };
    App.prototype.setStudentInteractive = function (student, studentInteractive) {
        if (history.pushState) {
            var href = this.getInteractiveHref(student, studentInteractive);
            history.pushState({ student: student, studentInteractive: studentInteractive }, "", href);
        }
        this.setState({
            student: student,
            studentInteractive: studentInteractive
        });
    };
    App.prototype.renderPage = function () {
        if (this.state.class !== null) {
            if ((this.state.studentInteractive !== null) && (this.state.student !== null)) {
                return React.createElement(student_page_1.StudentPage, { studentInteractive: this.state.studentInteractive, student: this.state.student, setStudentInteractive: this.setStudentInteractive, getInteractiveHref: this.getInteractiveHref, classInfo: this.classInfo });
            }
            return React.createElement(classroom_page_1.ClassroomPage, { class: this.state.class, interactives: this.state.interactives, students: this.state.students, activity: this.state.activity, setStudentInteractive: this.setStudentInteractive, getInteractiveHref: this.getInteractiveHref, classInfo: this.classInfo });
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

/***/ 88:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var superagent = __webpack_require__(55);
var escape_firebase_key_1 = __webpack_require__(57);
var ClassInfo = (function () {
    function ClassInfo(classInfoUrl) {
        this.classInfoUrl = classInfoUrl;
        this.name = null;
        this.studentNames = {};
        this.anonymousStudentNames = {};
        this.nextAnonymousId = 1;
        this.callbacks = [];
    }
    ClassInfo.prototype.getClassInfo = function (callback) {
        if (this.name && this.privateClassHash) {
            callback(null, {
                name: this.name,
                privateClassHash: this.privateClassHash,
                studentNames: this.studentNames
            });
        }
        else {
            this.callEndpoint(callback);
        }
    };
    ClassInfo.prototype.getStudentName = function (email) {
        var key = escape_firebase_key_1.default(email);
        if (this.studentNames[key] !== undefined) {
            return {
                found: true,
                name: this.studentNames[key]
            };
        }
        if (this.anonymousStudentNames[key] !== undefined) {
            return {
                found: true,
                name: this.anonymousStudentNames[key]
            };
        }
        this.anonymousStudentNames[key] = "Student " + this.nextAnonymousId++;
        return {
            found: false,
            name: this.anonymousStudentNames[key]
        };
    };
    ClassInfo.prototype.getStudentNames = function (callback) {
        var _this = this;
        this.callEndpoint(function (err, result) {
            callback(err, _this.studentNames);
        });
    };
    ClassInfo.prototype.callEndpoint = function (callback) {
        var _this = this;
        // only allow one in-flight
        this.callbacks.push(callback);
        if (this.callbacks.length > 1) {
            return;
        }
        superagent
            .get(this.classInfoUrl)
            .withCredentials()
            .set('Accept', 'application/json')
            .end(function (err, res) {
            try {
                var result = JSON.parse(res.text);
                var allInfo_1 = null;
                var error_1 = null;
                if (result.response_type !== "ERROR") {
                    _this.name = result.name;
                    _this.privateClassHash = result.private_class_hash;
                    _this.studentNames = {};
                    result.students.forEach(function (student) {
                        _this.studentNames[escape_firebase_key_1.default(student.email)] = student.name;
                    });
                    allInfo_1 = {
                        name: result.name,
                        privateClassHash: result.private_class_hash,
                        studentNames: _this.studentNames
                    };
                }
                else if (result.message) {
                    error_1 = result.message;
                }
                _this.callbacks.forEach(function (cb) {
                    cb(error_1, allInfo_1);
                });
            }
            catch (e) { }
        });
    };
    return ClassInfo;
}());
exports.ClassInfo = ClassInfo;


/***/ }),

/***/ 89:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(10);
var ago_1 = __webpack_require__(203);
var ClassroomPage = (function (_super) {
    __extends(ClassroomPage, _super);
    function ClassroomPage(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {
            currentTab: "students"
        };
        return _this;
    }
    ClassroomPage.prototype.createOnClick = function (href, student, studentInteractive) {
        var _this = this;
        return function (e) {
            e.preventDefault();
            _this.props.setStudentInteractive(student, studentInteractive);
        };
    };
    ClassroomPage.prototype.renderStudent = function (student) {
        var _this = this;
        var interactives = Object.keys(student.interactives).map(function (interactiveId) {
            var studentInteractives = student.interactives[interactiveId];
            var studentInteractive = studentInteractives[0];
            var key = student.id + "-" + interactiveId;
            var href = _this.props.getInteractiveHref(student, studentInteractive);
            var onClick = _this.createOnClick(href, student, studentInteractive);
            return React.createElement("span", { key: key },
                React.createElement("a", { href: href, onClick: onClick }, studentInteractive.name),
                " (",
                studentInteractives.length,
                ")");
        });
        return React.createElement("tr", { key: student.id },
            React.createElement("td", null, student.name),
            React.createElement("td", null, interactives));
    };
    ClassroomPage.prototype.renderInteractive = function (interactive) {
        var _this = this;
        var students = Object.keys(interactive.students).map(function (studentId) {
            var student = interactive.students[studentId];
            var studentInteractives = student.interactives[interactive.id];
            var studentInteractive = studentInteractives[0];
            var key = student.id + "-" + interactive.id;
            var href = _this.props.getInteractiveHref(student, studentInteractive);
            var onClick = _this.createOnClick(href, student, studentInteractive);
            return React.createElement("span", { key: key },
                React.createElement("a", { href: href, onClick: onClick }, student.name),
                " (",
                studentInteractives.length,
                ")");
        });
        return React.createElement("tr", { key: interactive.id },
            React.createElement("td", null, interactive.name),
            React.createElement("td", null, students));
    };
    ClassroomPage.prototype.renderStudents = function () {
        if (this.props.students.length === 0) {
            return React.createElement("div", null, "No students have published any interactives yet");
        }
        return React.createElement("table", { className: "u-full-width" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "Student"),
                    React.createElement("th", null, "Published Interactives"))),
            React.createElement("tbody", null, this.props.students.map(this.renderStudent.bind(this))));
    };
    ClassroomPage.prototype.renderInteractives = function () {
        if (this.props.interactives.length === 0) {
            return React.createElement("div", null, "No interactives have been published yet");
        }
        return React.createElement("table", { className: "u-full-width" },
            React.createElement("thead", null,
                React.createElement("tr", null,
                    React.createElement("th", null, "Published Interactive"),
                    React.createElement("th", null, "Students"))),
            React.createElement("tbody", null, this.props.interactives.map(this.renderInteractive.bind(this))));
    };
    ClassroomPage.prototype.renderActivity = function (activity, index) {
        var href = this.props.getInteractiveHref(activity.student, activity.studentInteractive);
        var onClick = this.createOnClick(href, activity.student, activity.studentInteractive);
        return React.createElement("div", { className: "activity", key: activity.student.id + "-" + activity.studentInteractive.id + "-" + index },
            activity.student.name,
            " published",
            React.createElement("a", { href: href, onClick: onClick }, activity.studentInteractive.name),
            ago_1.ago(activity.studentInteractive.createdAt));
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
            React.createElement("li", { className: this.state.currentTab === "students" ? "active" : "" },
                React.createElement("span", { onClick: selectTab("students") }, "Students")),
            React.createElement("li", { className: this.state.currentTab === "interactives" ? "active" : "" },
                React.createElement("span", { onClick: selectTab("interactives") }, "Interactives")),
            React.createElement("li", { className: this.state.currentTab === "activity" ? "active" : "" },
                React.createElement("span", { onClick: selectTab("activity") }, "Activity")));
    };
    ClassroomPage.prototype.renderCurrentTab = function () {
        switch (this.state.currentTab) {
            case "students":
                return this.renderStudents();
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

/***/ 91:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var React = __webpack_require__(10);
var ago_1 = __webpack_require__(203);
var StudentPage = (function (_super) {
    __extends(StudentPage, _super);
    function StudentPage(props) {
        var _this = _super.call(this, props) || this;
        _this.versionSelected = _this.versionSelected.bind(_this);
        _this.state = {
            currentInteractiveCount: 0
        };
        return _this;
    }
    StudentPage.prototype.componentDidMount = function () {
        // TODO: resize iframe
    };
    StudentPage.prototype.componentWillReceiveProps = function (nextProps) {
        // check if the student added a version
        if (nextProps.student.id === this.props.student.id) {
            var nextInteractives = nextProps.student.interactives[this.props.studentInteractive.id];
            var currentInteractives = this.props.student.interactives[this.props.studentInteractive.id];
            if (nextInteractives.length > currentInteractives.length) {
                debugger;
            }
        }
    };
    StudentPage.prototype.versionSelected = function (e) {
        e.preventDefault();
        var value = parseInt(e.currentTarget.value, 10);
        var interactives = this.props.student.interactives[this.props.studentInteractive.id];
        var interactive = interactives.filter(function (interactive) { return interactive.createdAt === value; })[0];
        if (interactive) {
            this.props.setStudentInteractive(this.props.student, interactive);
        }
    };
    StudentPage.prototype.renderDropdown = function () {
        var interactives = this.props.student.interactives[this.props.studentInteractive.id];
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
            React.createElement("select", { ref: "createdAtSelect", onChange: this.versionSelected, value: this.props.studentInteractive.createdAt }, options));
    };
    StudentPage.prototype.render = function () {
        return React.createElement("div", { className: "page" },
            React.createElement("div", { className: "page-header" },
                React.createElement("h4", null,
                    this.props.student.name,
                    ": ",
                    this.props.studentInteractive.name),
                this.renderDropdown()),
            React.createElement("iframe", { className: "u-full-width", src: this.props.studentInteractive.url }));
    };
    return StudentPage;
}(React.Component));
exports.StudentPage = StudentPage;


/***/ })

},[200]);
//# sourceMappingURL=app.js.map