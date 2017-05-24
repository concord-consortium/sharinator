import * as React from "react";
import { IFrameOverlay } from "./iframe-overlay"
import { getParam, getUID, FirebaseDemo } from "./demo"

const queryString = require("query-string")
const superagent = require("superagent")

declare var iframePhone: any
declare var firebase: any  // @types/firebase is not Firebase 3

export interface IFrameProps {
}

export interface IFrameState {
  src: string|null
  irsUrl: string|null
  copyUrl: string|null
  authoring: boolean,
  authoredState: AuthoredState|null,
  authoringError: string|null
  initInteractiveData: InitInteractiveData|null
  demoUID: string|null
  demoUser?: string
}

export interface AuthoredState {
  laraSharedUrl: string
  docStoreUrl: string
  autoLaunchUrl: string
  codapUrl: string
}

export interface InteractiveRunStateData {
  docStoreUrl: string
  copyUrl: string
}

export interface InitInteractiveData {
  version: number
  error: string|null
  mode: "authoring"|"runtime"
  authoredState: AuthoredState
  interactiveState: any|null
  globalInteractiveState: any|null
  hasLinkedInteractive: boolean
  linkedState: any|null
  interactiveStateUrl: string
  collaboratorUrls: string|null
  publicClassHash: string|null
  classInfoUrl: string|null
  interactive: InitInteractiveInteractiveData
  authInfo: InitInteractiveAuthInfoData
}

export interface InitInteractiveInteractiveData {
  id: number
  name: string
}
export interface InitInteractiveAuthInfoData {
  provider: string
  loggedIn: boolean
  email: string
}

export class IFrame extends React.Component<IFrameProps, IFrameState> {
  private classroomRef:any
  private clientPhone:any
  private serverPhone:any
  private iframeCanAutosave = false

  refs: {
    [string: string]: any;
    iframe: HTMLIFrameElement;
    laraSharedUrl: HTMLInputElement;
  }

  constructor(props: IFrameProps) {
    super(props)

    this.submitAuthoringInfo = this.submitAuthoringInfo.bind(this)
    this.getInteractiveState = this.getInteractiveState.bind(this)
    this.setupNormalMode = this.setupNormalMode.bind(this)

    const demoUID = getUID("demo")
    const demoUser = getParam("demoUser")

    this.state = {
      irsUrl: null,
      src: null,
      authoring: false,
      authoredState: null,
      authoringError: null,
      initInteractiveData: null,
      copyUrl: null,
      demoUID: demoUID,
      demoUser: demoUser
    }
  }

  componentDidMount() {
    if (this.state.demoUID) {
      this.setupDemoMode()
    }
    else {
      // TODO: figure out why iframe phone needs the delay
      setTimeout(this.setupNormalMode, 1000)
    }
  }

  setupDemoMode() {
    const demoRef = firebase.database().ref(`demos/${this.state.demoUID}`)
    demoRef.once("value", (snapshot:any) => {
      const demo:FirebaseDemo = snapshot.val()
      const authoredState:AuthoredState = demo.authoredState
      const email = this.state.demoUser ? demo.users[this.state.demoUser].email : "no-email@example.com"
      const src = `${authoredState.autoLaunchUrl}?${queryString.stringify({server: authoredState.codapUrl})}`
      const demoParams = `demo=${this.state.demoUID}&demoUser=${this.state.demoUser}`
      const demoAPIUrl = (endPoint:string) => {
        return `https://us-central1-classroom-sharing.cloudfunctions.net/${endPoint}?${demoParams}`
      }
      this.setState({
        src: src,
        irsUrl: demoAPIUrl("demoInteractiveRunState"),
        initInteractiveData: {
          version: 1,
          error: null,
          mode: "runtime",
          authoredState: authoredState,
          interactiveState: null,
          globalInteractiveState: null,
          hasLinkedInteractive: false,
          linkedState: null,
          interactiveStateUrl: demoAPIUrl("demoInteractiveRunState"),
          collaboratorUrls: null,
          publicClassHash: this.state.demoUID,
          classInfoUrl: demoAPIUrl("demoClassInfo"),
          interactive: {id: 1, name: "demo"},
          authInfo: {provider: "demo", loggedIn: true, email: email}
        },
        authoredState: authoredState
      })
      setTimeout(this.getInteractiveState, 10);
    })
  }

  setupNormalMode() {
    this.clientPhone = iframePhone.getIFrameEndpoint()
    this.clientPhone.addListener('initInteractive', (data:InitInteractiveData) => {
      if (data.mode === "authoring") {
        this.setState({
          authoring: true,
          authoredState: data.authoredState
        })
        return
      }

      const authoredState:AuthoredState = data.authoredState
      const src = `${authoredState.autoLaunchUrl}?${queryString.stringify({server: authoredState.codapUrl})}`

      this.setState({
        src: src,
        irsUrl: data.interactiveStateUrl,
        initInteractiveData: data,
        authoredState: data.authoredState
      })

      if (data.interactiveStateUrl)  {
        setTimeout(this.getInteractiveState, 1000)
      }
    })
    this.clientPhone.addListener('getInteractiveState', () => {
      if (this.iframeCanAutosave) {
        this.postMessageToInnerIframe('cfm::autosave');
      }
      else {
        this.clientPhone.post('interactiveState', 'nochange');
      }
    });
    this.clientPhone.initialize();
    this.clientPhone.post('supportedFeatures', {
      apiVersion: 1,
      features: {
        authoredState: true,
        interactiveState: true
      }
    })
  }

  postMessageToInnerIframe(type:string) {
    if (this.refs.iframe) {
      this.refs.iframe.contentWindow.postMessage({type: type}, '*')
    }
  }

  componentDidUpdate() {
    if (this.state.authoring) {
      this.refs.laraSharedUrl.focus()
    }
    else if (this.refs.iframe && !this.serverPhone) {
      // proxy the result of the initInteractive message from LARA to the docstore
      this.serverPhone = new iframePhone.ParentEndpoint(this.refs.iframe, () => {
        this.serverPhone.post("initInteractive", this.state.initInteractiveData)
      })

      // setup a generic postmessage CFM listener for the iframed CODAP window that autolaunch loads
      // we can't use the serverPhone here because it is an iframe embedded in an iframe
      let keepPollingForCommands = true
      window.onmessage = (e) => {
        switch (e.data.type) {
          case "cfm::commands":
            this.iframeCanAutosave = e.data.commands && e.data.commands.indexOf('cfm::autosave') !== -1
            keepPollingForCommands = false
            break
          case "cfm::autosaved":
            if (this.clientPhone) {
              this.clientPhone.post('interactiveState', 'nochange')
            }
            break
        }
      }

      // keep asking for the cfm commands available until we get a response once the inner iframe loads
      const pollForCommandList = () => {
        if (keepPollingForCommands) {
          this.postMessageToInnerIframe('cfm::getCommands')
          setTimeout(pollForCommandList, 100)
        }
      }
      pollForCommandList()
    }
  }

  getInteractiveState() {
    const iframe = this
    superagent
      .get(this.state.irsUrl)
      .withCredentials()
      .set('Accept', 'application/json')
      .end((err:any, res:any) => {
        if (!err) {
          try {
            const json = JSON.parse(res.text)
            if (json && json.raw_data) {
              const rawData = JSON.parse(json.raw_data)
              if (rawData && rawData.docStore && rawData.docStore.accessKeys && rawData.docStore.accessKeys.readOnly && this.state.authoredState) {
                iframe.setState({
                  copyUrl: `${this.state.authoredState.docStoreUrl}/v2/documents?source=${rawData.docStore.recordid}&accessKey=RO::${rawData.docStore.accessKeys.readOnly}`,
                })
              }
              return
            }
          }
          catch (e) {}
          setTimeout(this.getInteractiveState, 1000)
        }
      });
  }

  submitAuthoringInfo(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      const authoredState = parseURLIntoAuthoredState(this.refs.laraSharedUrl.value)
      this.setState({authoringError: null})
      this.clientPhone.post('authoredState', authoredState)
    }
    catch (e) {
      this.setState({authoringError: e.message})
    }
  }

  renderAuthoring():JSX.Element {
    const inputStyle = {width: "100%"}
    const errorStyle = {color: "#f00", marginTop: 10, marginBottom: 10}
    const url = (this.state.authoredState ? this.state.authoredState.laraSharedUrl : "") || ""
    return <form onSubmit={this.submitAuthoringInfo}>
             {this.state.authoringError ? <div style={errorStyle}>{this.state.authoringError}</div> : null}
             <label htmlFor="laraSharedUrl">Shared URL from LARA tab in CODAP</label>
             <input type="text" id="laraSharedUrl" ref="laraSharedUrl" style={inputStyle} defaultValue={url} />
             <input type="submit" value="Save" />
           </form>
  }

  renderIFrame():JSX.Element|null {
    if (this.state.src) {
      return <div id="iframe">
              <iframe ref="iframe" src={this.state.src}></iframe>
              <IFrameOverlay initInteractiveData={this.state.initInteractiveData} copyUrl={this.state.copyUrl} authoredState={this.state.authoredState} />
            </div>
    }
    return null
  }

  render() {
    if (this.state.authoring) {
      return this.renderAuthoring()
    }
    return this.renderIFrame()
  }
}

export function parseURLIntoAuthoredState(url:string) {
  let [docStoreUrl, query, ...rest] = url.split("?")
  const urlMatches = docStoreUrl.match(/^((https?:\/\/[^/]+\/)v2\/documents\/\d+\/(auto)?launch)/)
  const launchParams = queryString.parse(query || "")
  const matchProtocol = (url:string):string => {
    const a = document.createElement("a")
    a.href = url
    a.protocol = location.protocol
    return a.href
  }

  if (!urlMatches || !launchParams.server) {
    throw new Error("This URL does not appear to be a shared URL from the LARA tab in CODAP")
  }

  docStoreUrl = matchProtocol(urlMatches[2].replace(/\/+$/, "")) // remove trailing slashes

  let codapUrl
  [codapUrl, query, ...rest] = launchParams.server.split("?")
  const codapParams = queryString.parse(query || "")
  codapParams.componentMode = "yes"
  codapParams.documentServer = docStoreUrl
  codapParams.saveSecondaryFileViaPostMessage = "yes"
  codapUrl = matchProtocol(`${codapUrl}?${queryString.stringify(codapParams)}`)

  const authoredState:AuthoredState = {
    laraSharedUrl: url,
    docStoreUrl: codapParams.documentServer,
    autoLaunchUrl: matchProtocol(urlMatches[1].replace("/launch", "/autolaunch")), // change to autolaunch
    codapUrl: codapUrl
  }

  return authoredState
}

