import * as React from "react";
import { Interactive, InteractiveMap, Student, StudentMap, StudentInteractive, Activity} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"

export interface ClassroomPageProps {
  setStudentInteractive:(student:Student, interactive:StudentInteractive) => void
  getInteractiveHref: (student:Student, studentInteractive:StudentInteractive) => string
  class: string,
  interactives: Array<Interactive>
  students: Array<Student>
  activity: Array<Activity>
  classInfo: ClassInfo
}

export type Tab = "students" | "interactives" | "activity"

export interface ClassroomPageState {
  currentTab: Tab
}

export type ClickHandler = (e:React.MouseEvent<HTMLAnchorElement>) => void

export class ClassroomPage extends React.Component<ClassroomPageProps, ClassroomPageState> {

  constructor(props: ClassroomPageProps) {
    super(props)

    this.state = {
      currentTab: "students"
    }
  }

  createOnClick(href: string, student:Student, studentInteractive:StudentInteractive):ClickHandler {
    return (e:React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      this.props.setStudentInteractive(student, studentInteractive)
    }
  }

  renderStudent(student:Student):JSX.Element {
    const interactives:Array<JSX.Element> = Object.keys(student.interactives).map<JSX.Element>((interactiveId) => {
      const studentInteractives = student.interactives[interactiveId]
      const studentInteractive = studentInteractives[0]
      const key = `${student.id}-${interactiveId}`
      const href = this.props.getInteractiveHref(student, studentInteractive)
      const onClick = this.createOnClick(href, student, studentInteractive)
      return <span key={key}><a href={href} onClick={onClick}>{studentInteractive.name}</a> ({studentInteractives.length})</span>
    })

    return <tr key={student.id}>
             <td>{student.name}</td>
             <td>{interactives}</td>
           </tr>
  }

  renderInteractive(interactive:Interactive):JSX.Element {
    const students:Array<JSX.Element> = Object.keys(interactive.students).map<JSX.Element>((studentId) => {
      const student = interactive.students[studentId]
      const studentInteractives = student.interactives[interactive.id]
      const studentInteractive = studentInteractives[0]
      const key = `${student.id}-${interactive.id}`
      const href = this.props.getInteractiveHref(student, studentInteractive)
      const onClick = this.createOnClick(href, student, studentInteractive)
      return <span key={key}><a href={href} onClick={onClick}>{student.name}</a> ({studentInteractives.length})</span>
    })

    return <tr key={interactive.id}>
             <td>{interactive.name}</td>
             <td>{students}</td>
           </tr>
  }

  renderStudents():JSX.Element {
    if (this.props.students.length === 0) {
      return <div>No students have published any interactives yet</div>
    }
    return <table className="u-full-width">
             <thead>
               <tr>
                 <th>Student</th>
                 <th>Published Interactives</th>
               </tr>
             </thead>
             <tbody>
               {this.props.students.map(this.renderStudent.bind(this))}
             </tbody>
           </table>
  }

  renderInteractives():JSX.Element {
    if (this.props.interactives.length === 0) {
      return <div>No interactives have been published yet</div>
    }
    return <table className="u-full-width">
             <thead>
               <tr>
                 <th>Published Interactive</th>
                 <th>Students</th>
               </tr>
             </thead>
             <tbody>
               {this.props.interactives.map(this.renderInteractive.bind(this))}
             </tbody>
           </table>
  }

  renderActivity(activity:Activity, index:number):JSX.Element {
    const href = this.props.getInteractiveHref(activity.student, activity.studentInteractive)
    const onClick = this.createOnClick(href, activity.student, activity.studentInteractive)
    return <div className="activity" key={`${activity.student.id}-${activity.studentInteractive.id}-${index}`}>
            {activity.student.name} published
            <a href={href} onClick={onClick}>{activity.studentInteractive.name}</a>
            {ago(activity.studentInteractive.createdAt)}
           </div>
  }

  renderActivityList():JSX.Element {
    if (this.props.activity.length === 0) {
      return <div>There has been no activity in this classroom yet</div>
    }
    return <div className="activity-list">{this.props.activity.map(this.renderActivity.bind(this))}</div>
  }

  renderTabs() {
    const selectTab = (tab:Tab) => {
      return () => {
        this.setState({currentTab: tab})
      }
    }
    return <ul className="tab">
             <li className={this.state.currentTab === "students" ? "active" : ""}><span onClick={selectTab("students")}>Students</span></li>
             <li className={this.state.currentTab === "interactives" ? "active" : ""}><span onClick={selectTab("interactives")}>Interactives</span></li>
             <li className={this.state.currentTab === "activity" ? "active" : ""}><span onClick={selectTab("activity")}>Activity</span></li>
           </ul>
  }

  renderCurrentTab() {
    switch (this.state.currentTab) {
      case "students":
        return this.renderStudents()
      case "interactives":
        return this.renderInteractives()
      case "activity":
        return this.renderActivityList()
    }
  }

  render() {
    return <div className="page">
      { this.renderTabs() }
      { this.renderCurrentTab() }
    </div>
  }
}