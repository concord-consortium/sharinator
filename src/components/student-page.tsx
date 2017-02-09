import * as React from "react";
import { Interactive, StudentInteractive, InteractiveMap, Student} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"

export interface StudentPageProps {
  setStudentInteractive:(student:Student, interactive:StudentInteractive) => void
  getInteractiveHref: (student:Student, studentInteractive:StudentInteractive) => string
  studentInteractive: StudentInteractive
  student: Student
  classInfo: ClassInfo
}

export interface StudentPageState {
  currentInteractiveCount: number
}

export class StudentPage extends React.Component<StudentPageProps, StudentPageState> {

  constructor(props: StudentPageProps) {
    super(props)
    this.versionSelected = this.versionSelected.bind(this)
    this.state = {
      currentInteractiveCount: 0
    }
  }

  componentDidMount() {
    // TODO: resize iframe
  }

  componentWillReceiveProps(nextProps:StudentPageProps) {
    // check if the student added a version
    if (nextProps.student.id === this.props.student.id) {
      const nextInteractives = nextProps.student.interactives[this.props.studentInteractive.id]
      const currentInteractives = this.props.student.interactives[this.props.studentInteractive.id]
      if (nextInteractives.length > currentInteractives.length) {
        debugger
      }
    }
  }


  versionSelected(e:React.SyntheticEvent<HTMLSelectElement>) {
    e.preventDefault()
    const value = parseInt(e.currentTarget.value, 10)
    const interactives = this.props.student.interactives[this.props.studentInteractive.id]
    const interactive = interactives.filter((interactive) => { return interactive.createdAt === value})[0]
    if (interactive) {
      this.props.setStudentInteractive(this.props.student, interactive)
    }
  }

  renderDropdown() {
    const interactives = this.props.student.interactives[this.props.studentInteractive.id]
    if (interactives.length < 2) {
      return null
    }
    const options = interactives.map<JSX.Element>((interactive, index) => {
      const number = interactives.length - index
      return <option key={index} value={interactive.createdAt}>Version #{number}, published {ago(interactive.createdAt)}</option>
    })
    return <div><select ref="createdAtSelect" onChange={this.versionSelected} value={this.props.studentInteractive.createdAt}>{options}</select></div>
  }

  render() {
    return <div className="page">
      <div className="page-header">
        <h4>{this.props.student.name}: {this.props.studentInteractive.name}</h4>
        { this.renderDropdown() }
      </div>
      <iframe className="u-full-width" src={this.props.studentInteractive.url}></iframe>
    </div>
  }
}