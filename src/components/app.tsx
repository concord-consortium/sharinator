import * as React from "react";
import { Interactive, InteractiveMap, Student, StudentMap, StudentInteractive, FirebaseInteractive, FirebaseStudent, FirebaseData, FirebaseStudentInteractive, Activity} from "./types"
import { StudentPage } from "./student-page"
import { ClassroomPage } from "./classroom-page"
import { ClassInfo } from "./class-info"

declare var firebase: any;  // @types/firebase is not Firebase 3

const base64url = require("base64-url")
const queryString = require("query-string")

export interface AppProps {
}

export interface AppState {
  class: string|null
  className: string|null
  loading: boolean
  error: string|null
  studentInteractive: StudentInteractive|null
  student: Student|null
  interactives: Array<Interactive>
  students: Array<Student>,
  activity: Array<Activity>
  firebaseData: any|null
}

export class App extends React.Component<AppProps, AppState> {
  private classroomRef:any
  private classInfo:ClassInfo

  constructor(props: AppProps) {
    super(props)

    this.setStudentInteractive = this.setStudentInteractive.bind(this)
    this.getInteractiveHref = this.getInteractiveHref.bind(this)

    this.state = {
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
    }
  }

  componentWillMount() {
    const query = queryString.parse(location.search)
    let firstLoad = true

    if (!query.class) {
      return this.setState({error: "Missing class in query string"})
    }
    this.setState({loading: true, class: query.class})

    this.classInfo = new ClassInfo(base64url.decode(query.class))
    this.classInfo.getClassInfo((err, info) => {
      if (err) {
        this.setState({
          loading: false,
          error: err
        })
        return
      }

      this.setState({className: info.name})

      // connect to firebase
      this.classroomRef = firebase.database().ref(`classes/${info.privateClassHash}`)
      this.classroomRef.on("value", (snapshot:any) => {
        const interactives:Array<Interactive> = []
        const students:Array<Student> = []
        const activity:Array<Activity> = []
        const firebaseData = snapshot.val()
        let student:Student|null = null
        let studentInteractive:StudentInteractive|null = null
        let error:string|null = null
        let createdAt:number|null = null
        const interactiveMap:InteractiveMap = {}
        const studentMap:StudentMap = {}
        let studentNamesNotFound:boolean = false

        if (firebaseData) {
          if (firebaseData.interactives) {
            Object.keys(firebaseData.interactives).forEach((firebaseInteractiveId) => {
              const firebaseInteractive:FirebaseInteractive = firebaseData.interactives[firebaseInteractiveId]
              const interactive:Interactive = {
                id: firebaseInteractiveId,
                name: firebaseInteractive.name,
                students: {}
              }
              interactives.push(interactive)
              interactiveMap[firebaseInteractiveId] = interactive
            })
          }

          if (firebaseData.students) {
            Object.keys(firebaseData.students).forEach((firebaseStudentId) => {
              const firebaseStudent:FirebaseStudent = firebaseData.students[firebaseStudentId]
              const studentName = this.classInfo.getStudentName(firebaseStudentId)
              const student:Student = {
                id: firebaseStudentId,
                name: studentName.name,
                interactives: {}
              }
              if (!studentName.found) {
                studentNamesNotFound = true
              }

              if (firebaseStudent.interactives) {
                Object.keys(firebaseStudent.interactives).forEach((firebaseInteractiveId) => {
                  const interactive = interactiveMap[firebaseInteractiveId]
                  if (interactive) {
                    const studentInteractives = student.interactives[firebaseInteractiveId] = student.interactives[firebaseInteractiveId] || []
                    const firebaseStudentInteractives = firebaseStudent.interactives[firebaseInteractiveId]
                    Object.keys(firebaseStudentInteractives).forEach((firebaseStudentInteractiveId) => {
                      const firebaseStudentInteractive = firebaseStudentInteractives[firebaseStudentInteractiveId]
                      const studentInteractive:StudentInteractive = {
                        id: firebaseInteractiveId,
                        name: interactive.name,
                        url: firebaseStudentInteractive.url,
                        createdAt: firebaseStudentInteractive.createdAt
                      }
                      studentInteractives.push(studentInteractive)

                      activity.push({
                        student: student,
                        studentInteractive: studentInteractive
                      })
                    })
                    studentInteractives.sort((a, b) => {return b.createdAt - a.createdAt })
                  }
                })
              }
              students.push(student)
              studentMap[firebaseStudentId] = student
            })
          }

          students.sort((a, b) => {return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)})
          interactives.sort((a, b) => {return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)})
          activity.sort((a, b) => {return b.studentInteractive.createdAt - a.studentInteractive.createdAt})

          students.forEach((student) => {
            Object.keys(student.interactives).forEach((interactiveId) => {
              const interactive = interactiveMap[interactiveId]
              if (interactive) {
                interactive.students[student.id] = student
              }
            })
          })

          if (firstLoad) {
            window.addEventListener("popstate", (e) => {
              const state = e.state || {}
              const student = state.student || null
              const interactive = state.interactive || null

              this.setState({studentInteractive: state.studentInteractive || null, student: state.student || null})
            })

            if (query.interactive && query.student) {
              student = studentMap[query.student]
              const interactiveKey = `interactive_${query.interactive}`
              const interactive = interactiveMap[interactiveKey]
              if (student && interactive) {
                let studentInteractives = student.interactives[interactive.id]
                if (studentInteractives) {
                  if (query.createdAt) {
                    createdAt = parseInt(query.createdAt, 10)
                    studentInteractives = studentInteractives.filter((studentInteractive) => { return studentInteractive.createdAt === createdAt })
                  }
                  studentInteractive = studentInteractives[0] || null
                }
              }

              if (!student || !studentInteractive) {
                error = "Sorry, the requested student interactive was not found!"
              }
            }
            firstLoad = false
          }
        }
        else {
          error = "No interactives have been shared yet for this classroom"
        }

        this.setState({
          loading: false,
          error: error,
          interactives: interactives,
          students: students,
          activity: activity,
          student: student || this.state.student,
          studentInteractive: studentInteractive || this.state.studentInteractive,
          firebaseData: firebaseData
        })

        if (studentNamesNotFound) {
          this.classInfo.getStudentNames((err, names) => {
            if (err) {
              this.setState({error: err})
              return
            }
            this.setState({
              students: students.map((student) => {
                if (names[student.id] !== undefined) {
                  student.name = names[student.id]
                }
                return student
              })
            })
          })
        }
      })
    })


  }

  componentWillUnmount() {
    if (this.classroomRef) {
      this.classroomRef.off()
    }
  }

  onClassroomClick() {
    if (history.pushState && this.state.class) {
      history.pushState({}, "", `${location.pathname}?class=${this.state.class}`)
    }
    this.setState({studentInteractive: null, student: null})
  }

  renderNav():JSX.Element|null {
    if (this.state.class !== null) {
      const showClassroomButton = (this.state.student !== null) && (this.state.studentInteractive !== null)
      return <div className="nav">
               { this.state.className !== null ? <h3>{this.state.className}</h3> : null }
               {showClassroomButton ? <button key="classroom" className="button button-primary" onClick={this.onClassroomClick.bind(this)}>View All</button> : null}
             </div>
    }
    return null
  }

  getInteractiveHref(student:Student, studentInteractive:StudentInteractive):string {
    return `${location.pathname}?class=${this.state.class}&interactive=${studentInteractive.id.split("_")[1]}&student=${student.id}&createdAt=${studentInteractive.createdAt}`
  }

  setStudentInteractive(student:Student, studentInteractive:StudentInteractive) {
    if (history.pushState) {
      const href = this.getInteractiveHref(student, studentInteractive)
      history.pushState({student: student, studentInteractive: studentInteractive}, "", href)
    }

    this.setState({
      student: student,
      studentInteractive: studentInteractive
    })
  }

  renderPage():JSX.Element|null {
    if (this.state.class !== null) {
      if ((this.state.studentInteractive !== null) && (this.state.student !== null)) {
        return <StudentPage
                 studentInteractive={this.state.studentInteractive}
                 student={this.state.student}
                 setStudentInteractive={this.setStudentInteractive}
                 getInteractiveHref={this.getInteractiveHref}
                 classInfo={this.classInfo}
                 />
      }
      return <ClassroomPage
               class={this.state.class}
               interactives={this.state.interactives}
               students={this.state.students}
               activity={this.state.activity}
               setStudentInteractive={this.setStudentInteractive}
               getInteractiveHref={this.getInteractiveHref}
               classInfo={this.classInfo}
               />
    }
    return null
  }

  render() {
    return <div className="container">
      <div className="row">
        <div className="twelve columns">
          <div className="header">
            <img src="../assets/img/concord.png" /> Classroom Sharing
          </div>
          { this.renderNav() }
          { !this.state.error && this.state.loading ? <div className="section loading"><img src="../assets/img/loading.gif" /> Loading...</div> : null }
          { this.state.error ? <div className="section error">{this.state.error}</div> : null }
          { this.state.firebaseData ? this.renderPage() : null }
        </div>
      </div>
    </div>
  }
}