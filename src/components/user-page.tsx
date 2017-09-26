import * as React from "react"
import { Interactive, UserInteractive, InteractiveMap, User, IFramePhone} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"
import { InitInteractiveData, InitInteractiveInteractiveData } from "./iframe"
import { IFrameSidebar } from "./iframe-sidebar"

const queryString = require("query-string")

declare var iframePhone: IFramePhone

export interface UserPageProps {
  setUserInteractive:(user:User, interactive:UserInteractive) => void
  getInteractiveHref: (user:User, userInteractive:UserInteractive) => string
  userInteractive: UserInteractive
  user: User
  classInfo: ClassInfo
  authDomain: string
}

export interface UserPageState {
  currentInteractiveCount: number
  initInteractiveData: InitInteractiveData
  iframeUrl: string
}

export class UserPage extends React.Component<UserPageProps, UserPageState> {

  constructor(props: UserPageProps) {
    super(props)
    this.versionSelected = this.versionSelected.bind(this)

    const query = queryString.parse(location.search)

    const initInteractiveData:InitInteractiveData = {
      version: 1,
      error: null,
      mode: "runtime",
      authoredState: "",
      interactiveState: null,
      globalInteractiveState: null,
      hasLinkedInteractive: false,
      linkedState: null,
      interactiveStateUrl: "",
      collaboratorUrls: null,
      classInfoUrl: query.class,
      interactive: {
        id: parseInt(this.props.userInteractive.id.split("_")[1], 10),
        name: this.props.userInteractive.name
      },
      authInfo: {
        provider: "",
        loggedIn: true,
        email: ""
      }
    }
    this.state = {
      currentInteractiveCount: 0,
      initInteractiveData: initInteractiveData,
      iframeUrl: this.props.userInteractive.url.replace("?", "?embeddedServer=yes")
    }
  }

  refs: {
    iframe: HTMLIFrameElement
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
        <h4>{this.props.user.name.fullname}: {this.props.userInteractive.name}</h4>
        { this.renderDropdown() }
      </div>
      <div id="iframe" className="u-full-width">
        <iframe className="user-page-iframe" ref="iframe" src={this.state.iframeUrl}></iframe>
        <IFrameSidebar
          initInteractiveData={this.state.initInteractiveData}
          viewOnlyMode={true}
          group={0}
          groups={{}}
          snapshotsRef={null}
          iframeApi={{}}
          authDomain={this.props.authDomain}
        />
      </div>
    </div>
  }
}