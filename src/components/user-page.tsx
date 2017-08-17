import * as React from "react"
import { Interactive, UserInteractive, InteractiveMap, User, CODAPPhone, CODAPCommand, IFramePhone} from "./types"
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
}

export interface UserPageState {
  currentInteractiveCount: number
  initInteractiveData: InitInteractiveData
  codapPhone: CODAPPhone|null
  iframeUrl: string
}

export class UserPage extends React.Component<UserPageProps, UserPageState> {

  constructor(props: UserPageProps) {
    super(props)
    this.versionSelected = this.versionSelected.bind(this)
    this.iframeLoaded = this.iframeLoaded.bind(this)

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
      publicClassHash: null,
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
      codapPhone: null,
      iframeUrl: this.props.userInteractive.url.replace("?", "?embeddedServer=yes")
    }
  }

  codapPhoneHandler(command:CODAPCommand, callback:Function) {
    var success = false;
    if (command) {
      console.log('COMMAND!', command)
      switch (command.message) {
        case "codap-present":
          success = true;
          break;
      }
    }
    callback({success: success});
  }

  iframeLoaded() {
    if (this.refs.iframe && !this.state.codapPhone) {
      this.setState({codapPhone: new iframePhone.IframePhoneRpcEndpoint(this.codapPhoneHandler.bind(this), "data-interactive", this.refs.iframe)});
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
        <h4>{this.props.user.name.fullname}: {this.props.userInteractive.name}</h4>
        { this.renderDropdown() }
      </div>
      <div id="iframe" className="u-full-width">
        <iframe className="user-page-iframe" ref="iframe" src={this.state.iframeUrl} onLoad={this.iframeLoaded}></iframe>
        <IFrameSidebar initInteractiveData={this.state.initInteractiveData} copyUrl={null} authoredState={null} codapPhone={this.state.codapPhone} viewOnlyMode={false} />
      </div>
    </div>
  }
}