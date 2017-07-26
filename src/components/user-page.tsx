import * as React from "react"
import { Interactive, UserInteractive, InteractiveMap, User} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"
import { IFrameSidebar } from "./iframe-sidebar"

export interface UserPageProps {
  setUserInteractive:(user:User, interactive:UserInteractive) => void
  getInteractiveHref: (user:User, userInteractive:UserInteractive) => string
  userInteractive: UserInteractive
  user: User
  classInfo: ClassInfo
}

export interface UserPageState {
  currentInteractiveCount: number
}

export class UserPage extends React.Component<UserPageProps, UserPageState> {

  constructor(props: UserPageProps) {
    super(props)
    this.versionSelected = this.versionSelected.bind(this)
    this.state = {
      currentInteractiveCount: 0
    }
  }

  componentDidMount() {
    // TODO: resize iframe
  }

  componentWillReceiveProps(nextProps:UserPageProps) {
    // check if the student added a version
    if (nextProps.user.id === this.props.user.id) {
      const nextInteractives = nextProps.user.interactives[this.props.userInteractive.id]
      const currentInteractives = this.props.user.interactives[this.props.userInteractive.id]
      if (nextInteractives.length > currentInteractives.length) {
        //debugger
      }
    }
  }


  versionSelected(e:React.SyntheticEvent<HTMLSelectElement>) {
    e.preventDefault()
    const value = parseInt(e.currentTarget.value, 10)
    const interactives = this.props.user.interactives[this.props.userInteractive.id]
    const interactive = interactives.filter((interactive) => { return interactive.createdAt === value})[0]
    if (interactive) {
      this.props.setUserInteractive(this.props.user, interactive)
    }
  }

  renderDropdown() {
    const interactives = this.props.user.interactives[this.props.userInteractive.id]
    if (interactives.length < 2) {
      return null
    }
    const options = interactives.map<JSX.Element>((interactive, index) => {
      const number = interactives.length - index
      return <option key={index} value={interactive.createdAt}>Version #{number}, published {ago(interactive.createdAt)}</option>
    })
    return <div><select ref="createdAtSelect" onChange={this.versionSelected} value={this.props.userInteractive.createdAt}>{options}</select></div>
  }

  render() {
    return <div className="page">
      <div className="page-header">
        <h4>{this.props.user.name.firstName} {this.props.user.name.lastName}: {this.props.userInteractive.name}</h4>
        { this.renderDropdown() }
      </div>
      <div id="iframe" className="u-full-width">
        <iframe className="u-full-width" src={this.props.userInteractive.url}></iframe>
      </div>
    </div>
  }
}