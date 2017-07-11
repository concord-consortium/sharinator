import * as React from "react";
import { IFrameSidebar } from "./iframe-sidebar"
import { getParam, getUID, FirebaseDemo, DemoFirebaseSnapshot } from "./demo"
import {SuperagentError, SuperagentResponse} from "./types"

const queryString = require("query-string")
const superagent = require("superagent")
const base64url = require("base64-url")

declare var iframePhone: any
declare var firebase: any  // @types/firebase is not Firebase 3

export type CODAPPostData = any
export type CODAPListenerData = any
export interface CODAPPhone {
   addListener: (command: string, callback:(data:CODAPListenerData)=>void) => void
   post: (message: string, data:CODAPPostData) => void
   initialize: () => void
}

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
  codapPhone: CODAPPhone|null
}

export interface AuthoredState {
  laraSharedUrl: string
  docStoreUrl: string
  codapUrl: string
  codapParams: any
  documentId: string
}

export interface InteractiveRunStateData {
  docStoreUrl: string
  copyUrl: string
}

export interface InitInteractiveData {
  version: number
  error: string|null
  mode: "authoring"|"runtime"
  authoredState: AuthoredState|string
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

export interface LaunchParams {
  url: string
  source: string
  collaboratorUrls: string|null
  readOnlyKey?: string
}

export interface CODAPCommand {
  message: string
}

export class IFrame extends React.Component<IFrameProps, IFrameState> {
  private clientPhone:CODAPPhone
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
      demoUser: demoUser,
      codapPhone: null
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

  generateIframeSrc(initInteractiveData:InitInteractiveData) {
    const authoredState:AuthoredState = initInteractiveData.authoredState as AuthoredState
    const launchParams:LaunchParams = {url: initInteractiveData.interactiveStateUrl, source: authoredState.documentId, collaboratorUrls: initInteractiveData.collaboratorUrls}
    const linkedState = initInteractiveData.linkedState || {}
    const interactiveRunState = initInteractiveData.interactiveState || {}
    const codapParams = authoredState.codapParams || {}

    // if there is a linked state and no interactive state then change the source document to point to the linked recordid and add the access key
    if (linkedState.docStore && linkedState.docStore.recordid && linkedState.docStore.accessKeys && linkedState.docStore.accessKeys.readOnly && !(interactiveRunState && interactiveRunState.docStore && interactiveRunState.docStore.recordid)) {
      launchParams.source = linkedState.docStore.recordid;
      launchParams.readOnlyKey = linkedState.docStore.accessKeys.readOnly;
    }

    //codapParams.componentMode = "yes"
    codapParams.embeddedServer = "yes"
    codapParams.documentServer = authoredState.docStoreUrl
    codapParams.launchFromLara = base64url.encode(JSON.stringify(launchParams))

    return `${authoredState.codapUrl}?${queryString.stringify(codapParams)}`
  }

  setupDemoMode() {
    const demoRef = firebase.database().ref(`demos/${this.state.demoUID}`)
    demoRef.once("value", (snapshot:DemoFirebaseSnapshot) => {
      const demo:FirebaseDemo = snapshot.val()
      const demoParams = `demo=${this.state.demoUID}&demoUser=${this.state.demoUser}`
      const demoAPIUrl = (endPoint:string) => `https://us-central1-classroom-sharing.cloudfunctions.net/${endPoint}?${demoParams}`
      const email = this.state.demoUser ? demo.users[this.state.demoUser].email : "no-email@example.com"
      const initInteractiveData:InitInteractiveData = {
        version: 1,
        error: null,
        mode: "runtime",
        authoredState: demo.authoredState,
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
      }
      this.setState({
        src: this.generateIframeSrc(initInteractiveData),
        irsUrl: demoAPIUrl("demoInteractiveRunState"),
        initInteractiveData: initInteractiveData,
        authoredState: demo.authoredState
      })
      setTimeout(this.getInteractiveState, 10);
    })
  }

  setupNormalMode() {
    this.clientPhone = iframePhone.getIFrameEndpoint()
    this.clientPhone.addListener('initInteractive', (initInteractiveData:InitInteractiveData) => {
      let authoredState:AuthoredState|null = null
      if (typeof initInteractiveData.authoredState === "string") {
        try {
          authoredState = JSON.parse(initInteractiveData.authoredState as string)
        }
        catch (e) {}
      }
      else {
        authoredState = initInteractiveData.authoredState;
      }
      if (initInteractiveData.mode === "authoring") {
        this.setState({
          authoring: true,
          authoredState: authoredState
        })
        return
      }

      this.setState({
        src: this.generateIframeSrc(initInteractiveData),
        irsUrl: initInteractiveData.interactiveStateUrl,
        initInteractiveData: initInteractiveData,
        authoredState: authoredState
      })

      if (initInteractiveData.interactiveStateUrl)  {
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

  componentDidUpdate() {
    if (this.state.authoring) {
      this.refs.laraSharedUrl.focus()
    }
    else if (this.refs.iframe && !this.state.codapPhone) {
      this.setState({codapPhone: new iframePhone.IframePhoneRpcEndpoint(this.codapPhoneHandler.bind(this), "data-interactive", this.refs.iframe)});

      // setup a generic postmessage CFM listener for the iframed CODAP window
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
      .end((err:SuperagentError, res:SuperagentResponse) => {
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
    if (this.state.src && this.state.initInteractiveData) {
      return <div>
              <div id="iframe-container">
                <iframe ref="iframe" src={this.state.src}></iframe>
              </div>
              <IFrameSidebar initInteractiveData={this.state.initInteractiveData} copyUrl={this.state.copyUrl} authoredState={this.state.authoredState} codapPhone={this.state.codapPhone} />
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
  const [docStoreUrl, urlQuery, ...restOfUrl] = url.split("?")
  const urlMatches = docStoreUrl.match(/^(https?:\/\/[^/]+\/)v2\/documents\/(\d+)\/(auto)?launch/)
  const launchParams = queryString.parse(urlQuery || "")

  if (!urlMatches || !launchParams.server) {
    throw new Error("This URL does not appear to be a shared URL from the LARA tab in CODAP")
  }

  const [codapUrl, serverQuery, ...restOfServer] = launchParams.server.split("?")
  const codapParams = queryString.parse(serverQuery || "")

  const matchProtocol = (url:string):string => {
    const a = document.createElement("a")
    a.href = url
    a.protocol = location.protocol
    return a.href
  }

  const authoredState:AuthoredState = {
    laraSharedUrl: url,
    docStoreUrl: matchProtocol(urlMatches[1].replace(/\/+$/, "")), // remove trailing slashes
    codapUrl: matchProtocol(codapUrl),
    codapParams: codapParams,
    documentId: urlMatches[2]
  }

  return authoredState
}

