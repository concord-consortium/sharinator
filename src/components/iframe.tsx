import * as React from "react";
import { IFrameOverlay } from "./iframe-overlay"

const queryString = require("query-string")
const superagent = require("superagent")

declare var firebase: any  // @types/firebase is not Firebase 3
declare var iframePhone: any

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

  refs: {
    [string: string]: any;
    iframe: HTMLIFrameElement;
    laraSharedUrl: HTMLInputElement;
  }

  constructor(props: IFrameProps) {
    super(props)

    this.submitAuthoringInfo = this.submitAuthoringInfo.bind(this)
    this.getInteractiveState = this.getInteractiveState.bind(this)
    this.delayedMount = this.delayedMount.bind(this)

    this.state = {
      irsUrl: null,
      src: null,
      authoring: false,
      authoredState: null,
      authoringError: null,
      initInteractiveData: null,
      copyUrl: null
    }
  }

  componentDidMount() {
    // TODO: figure out why iframe phone needs the delay
    setTimeout(this.delayedMount, 1000)
  }

  delayedMount() {
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
    this.clientPhone.initialize();
    this.clientPhone.post('supportedFeatures', {
      apiVersion: 1,
      features: {
        authoredState: true
      }
    })
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

    const url = this.refs.laraSharedUrl.value
    let [docStoreUrl, query, ...rest] = url.split("?")
    const urlMatches = docStoreUrl.match(/^((https?:\/\/[^/]+\/)v2\/documents\/\d+\/(auto)?launch)/)
    const launchParams = queryString.parse(query || "")

    if (!urlMatches || !launchParams.server) {
      this.setState({authoringError: "This URL does not appear to be a shared URL from the LARA tab in CODAP"})
      return
    }
    this.setState({authoringError: null})

    docStoreUrl = this.matchProtocol(urlMatches[2].replace(/\/+$/, "")) // remove trailing slashes

    let codapUrl
    [codapUrl, query, ...rest] = launchParams.server.split("?")
    const codapParams = queryString.parse(query || "")
    codapParams.componentMode = "yes"
    codapParams.documentServer = docStoreUrl
    codapParams.saveSecondaryFileViaPostMessage = "yes"
    codapUrl = this.matchProtocol(`${codapUrl}?${queryString.stringify(codapParams)}`)

    const authoredState:AuthoredState = {
      laraSharedUrl: url,
      docStoreUrl: codapParams.documentServer,
      autoLaunchUrl: this.matchProtocol(urlMatches[1].replace("/launch", "/autolaunch")), // change to autolaunch
      codapUrl: codapUrl
    }

    this.clientPhone.post('authoredState', authoredState)
  }

  matchProtocol(url:string):string {
    const a = document.createElement("a")
    a.href = url
    a.protocol = location.protocol
    return a.href
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

  renderIFrame():JSX.Element {
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