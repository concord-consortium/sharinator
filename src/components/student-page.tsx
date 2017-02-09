import * as React from "react";
import { Interactive, StudentInteractive, InteractiveMap, Student} from "./types"
import { ClassInfo } from "./class-info"

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

const agoUnits = [
	{ max: 2760000, value: 60000, name: 'minute', prev: 'a minute ago' }, // max: 46 minutes
	{ max: 72000000, value: 3600000, name: 'hour', prev: 'an hour ago' }, // max: 20 hours
	{ max: 518400000, value: 86400000, name: 'day', prev: 'yesterday' }, // max: 6 days
	{ max: 2419200000, value: 604800000, name: 'week', prev: 'last week' }, // max: 28 days
	{ max: 28512000000, value: 2592000000, name: 'month', prev: 'last month' }, // max: 11 months
	{ max: Infinity, value: 31536000000, name: 'year', prev: 'last year' }
]

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

  ago(timestamp:number) {
    const diff = Math.abs(Date.now() - timestamp)
    if (diff < 60000) { // less than a minute
      return 'just now'
    }

    for (var i = 0; i < agoUnits.length; i++) {
      if (diff < agoUnits[i].max) {
      	const val = Math.floor(diff / agoUnits[i].value)
        return val <= 1 ? agoUnits[i].prev : `${val} ${agoUnits[i].name}s ago`;
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
      return <option key={index} value={interactive.createdAt}>Version #{number}, published {this.ago(interactive.createdAt)}</option>
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