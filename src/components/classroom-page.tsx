import * as React from "react";
import { Interactive, InteractiveMap, Student, StudentMap, StudentInteractive} from "./types"
import { ClassInfo } from "./class-info"

export interface ClassroomPageProps {
  setStudentInteractive:(student:Student, interactive:StudentInteractive) => void
  getInteractiveHref: (student:Student, studentInteractive:StudentInteractive) => string
  class: string,
  interactives: Array<Interactive>
  students: Array<Student>
  classInfo: ClassInfo
}

export interface ClassroomPageState {
}

export type ClickHandler = (e:React.MouseEvent<HTMLAnchorElement>) => void

export class ClassroomPage extends React.Component<ClassroomPageProps, ClassroomPageState> {

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
      return <div>No students have started any interactives yet</div>
    }
    return <table className="u-full-width">
             <thead>
               <tr>
                 <th>Student</th>
                 <th>Shared Interactives</th>
               </tr>
             </thead>
             <tbody>
               {this.props.students.map(this.renderStudent.bind(this))}
             </tbody>
           </table>
  }

  renderInteractives():JSX.Element {
    if (this.props.interactives.length === 0) {
      return <div>No interactives have been shared yet</div>
    }
    return <table className="u-full-width">
             <thead>
               <tr>
                 <th>Shared Interactive</th>
                 <th>Students</th>
               </tr>
             </thead>
             <tbody>
               {this.props.interactives.map(this.renderInteractive.bind(this))}
             </tbody>
           </table>
  }

  render() {
    return <div className="page">
      <div className="section-header">
        <h2>Students</h2>
      </div>
      { this.renderStudents() }
      <div className="section-header">
        <h2>Interactives</h2>
      </div>
      { this.renderInteractives() }
    </div>
  }
}