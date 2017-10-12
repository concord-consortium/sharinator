import * as React from "react"
import { Interactive, UserInteractive, InteractiveMap, User, IFramePhone, FirebaseRef} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"
import { InitInteractiveData, InitInteractiveInteractiveData } from "./iframe"
import { IFrameSidebar } from "./iframe-sidebar"
import { SnapshotUserInteractive } from "./types"
import { LaunchApplication, Representation } from "cc-sharing"

import * as refs from "./refs"

const queryString = require("query-string")

declare var iframePhone: IFramePhone

export interface UserPageProps {
  setUserInteractive:(user:User, interactive:UserInteractive) => void
  getInteractiveHref: (user:User, userInteractive:UserInteractive) => string
  snapshotItem: SnapshotUserInteractive
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
    const {snapshotItem} = this.props
    const {userInteractive, user} = snapshotItem

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
        id: parseInt(userInteractive.id.split("_")[1], 10),
        name: userInteractive.name
      },
      authInfo: {
        provider: "",
        loggedIn: true,
        email: ""
      }
    }

    let iframeUrl = snapshotItem.type === "application" ? snapshotItem.application.launchUrl : snapshotItem.representation.dataUrl
    if (iframeUrl.indexOf("codap") !== -1) {
      iframeUrl = iframeUrl.replace("?", "?embeddedServer=yes")
    }

    this.state = {
      currentInteractiveCount: 0,
      initInteractiveData: initInteractiveData,
      iframeUrl: iframeUrl
    }
  }

  extractSnapshotItem():LaunchApplication | Representation {
    const {snapshotItem} = this.props
    return snapshotItem.type === "application" ? snapshotItem.application : snapshotItem.representation
  }

  refs: {
    iframe: HTMLIFrameElement
  }

  versionSelected(e:React.SyntheticEvent<HTMLSelectElement>) {
    e.preventDefault()
    const {userInteractive, user} = this.props.snapshotItem
    const value = parseInt(e.currentTarget.value, 10)
    const interactives = user.interactives[userInteractive.id]
    const interactive = interactives.filter((interactive) => { return interactive.createdAt === value})[0]
    if (interactive) {
      this.props.setUserInteractive(user, interactive)
    }
  }

  renderDropdown() {
    const {userInteractive, user} = this.props.snapshotItem
    const interactives = user.interactives[userInteractive.id]
    if (interactives.length < 2) {
      return null
    }
    const options = interactives.map<JSX.Element>((interactive, index) => {
      const number = interactives.length - index
      return <option key={index} value={interactive.createdAt}>Version #{number}, published {ago(interactive.createdAt)}</option>
    })
    return <div><select ref="createdAtSelect" onChange={this.versionSelected} value={userInteractive.createdAt}>{options}</select></div>
  }

  render() {
    const {userInteractive, user} = this.props.snapshotItem
    /*
      REMOVE for now
        { this.renderDropdown() }

        <IFrameSidebar
          initInteractiveData={this.state.initInteractiveData}
          viewOnlyMode={true}
          group={0}
          groups={{}}
          iframeApi={{}}
          authDomain={this.props.authDomain}
        />

    */
    return <div className="page">
      <div className="page-header">
        <h4>{user.name.fullname}: {userInteractive.name}</h4>
        <h5>{ this.extractSnapshotItem().name }</h5>
      </div>
      <div id="iframe" className="u-full-width">
        <iframe className="user-page-iframe" ref="iframe" src={this.state.iframeUrl}></iframe>
        <div className="user-page-iframe-readonly-overlay"></div>
      </div>
    </div>
  }
}