import * as React from "react";
import { IFrameSidebar } from "./iframe-sidebar"
import {ClassInfo, GetUserName, AllClassInfo} from "./class-info"
import { getParam, getUID, FirebaseDemo, DemoFirebaseSnapshot } from "./demo"
import {SuperagentError, SuperagentResponse, IFramePhone, Firebase,
        InteractiveState, GlobalInteractiveState, LinkedState,
        FirebaseGroupMap, FirebaseGroupSnapshot, FirebaseRef, FirebaseGroupUser,
        FirebaseSavedSnapshot, FirebaseSavedSnapshotGroup} from "./types"
import escapeFirebaseKey from "./escape-firebase-key"
import {SharingParent, Context, PublishResponse, Representation} from "cc-sharing"
import {CodapShimParams, CODAPPhone, CODAPParams, CODAPCommand,
        SetCopyUrlMessage, SetCopyUrlMessageName,
        MergeIntoDocumentMessage, MergeIntoDocumentMessageName,
        CopyToClipboardMessage, CopyToClipboardMessageName} from "./codap-shim"

const queryString = require("query-string")
const superagent = require("superagent")
const base64url = require("base64-url")

declare var iframePhone: IFramePhone
declare var firebase: Firebase

export interface IFrameProps {
}

export interface IFrameState {
  src: string|null
  irsUrl: string|null
  needGroup: boolean,
  selectedGroup: boolean,
  group: number,
  authoring: boolean,
  authoredState: AuthoredState|null,
  authoringError: string|null
  initInteractiveData: InitInteractiveData|null
  demoUID: string|null
  demoUser?: string
  groups: FirebaseGroupMap
  allClassInfo: AllClassInfo|null
  iframeType: AuthoredStateType|null
  snapshotsRef:FirebaseRef|null
  lightboxImageUrl: string|null
}

export interface IFrameApi {
  handlePublish?: HandlePublishFunction
  setLightboxImageUrl?: (url:string|null) => void
  changeGroup?: () => void
  mergeIntoDocument?: (representation:Representation) => void
  copyToClipboard?: (representation:Representation) => void
}

export type AuthoredState = CODAPAuthoredState | CollabSpaceAuthoredState
export type AuthoredStateType = "codap" | "collabSpace"

export interface CODAPAuthoredState {
  type: "codap"
  grouped: boolean
  laraSharedUrl: string
  docStoreUrl: string
  codapUrl: string
  codapParams: CODAPParams
  documentId: string
}

export interface CollabSpaceAuthoredState {
  type: "collabSpace"
  grouped: boolean
  collabSpaceUrl: string
  session: string
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
  interactiveState: InteractiveState|null
  globalInteractiveState: GlobalInteractiveState|null
  hasLinkedInteractive: boolean
  linkedState: LinkedState|null
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

export type HandlePublishCallback = (err:any|null, snapshot?:PublishResponse) => void
export type HandlePublishFunction = (callback?:HandlePublishCallback) => void

export class IFrame extends React.Component<IFrameProps, IFrameState> {
  private laraPhone:CODAPPhone
  private groupArray:number[]
  private groupUserRef:FirebaseRef
  private innerIframePhone:IFramePhone
  private sharingParent:SharingParent
  private handlePublishCallback:HandlePublishCallback|null = null

  refs: {
    iframe: HTMLIFrameElement
    laraSharedUrl: HTMLInputElement
    group: HTMLSelectElement
  }

  constructor(props: IFrameProps) {
    super(props)

    this.submitAuthoringInfo = this.submitAuthoringInfo.bind(this)
    this.getInteractiveState = this.getInteractiveState.bind(this)
    this.setupNormalMode = this.setupNormalMode.bind(this)
    this.submitSelectGroup = this.submitSelectGroup.bind(this)
    this.changeGroup = this.changeGroup.bind(this)
    this.iframeLoaded = this.iframeLoaded.bind(this)
    this.handlePublish = this.handlePublish.bind(this)
    this.sendCopyUrl = this.sendCopyUrl.bind(this)
    this.setLightboxImageUrl = this.setLightboxImageUrl.bind(this)
    this.clearLightbox = this.clearLightbox.bind(this)
    this.waitForInnerIframe = this.waitForInnerIframe.bind(this)
    this.copyToClipboard = this.copyToClipboard.bind(this)
    this.mergeIntoDocument = this.mergeIntoDocument.bind(this)

    const demoUID = getUID("demo")
    const demoUser = getParam("demoUser")

    this.groupArray = []
    for (let i = 1; i <= 99; i++) {
      this.groupArray.push(i)
    }

    this.state = {
      irsUrl: null,
      src: null,
      authoring: false,
      authoredState: null,
      authoringError: null,
      initInteractiveData: null,
      demoUID: demoUID,
      demoUser: demoUser,
      needGroup: false,
      selectedGroup: false,
      group: 0,
      groups: {},
      allClassInfo: null,
      iframeType: null,
      snapshotsRef: null,
      lightboxImageUrl: null
    }
  }

  componentDidMount() {
    if (this.state.demoUID) {
      this.setupDemoMode()
    }
    else {
      setTimeout(this.setupNormalMode, 1000)
    }
  }

  generateIframeSrc() {
    const {initInteractiveData} = this.state
    if (!initInteractiveData) {
      return null
    }
    const authoredState:AuthoredState = initInteractiveData.authoredState as AuthoredState
    switch (authoredState.type) {
      case "codap":
        return this.generateCODAPIframeSrc(initInteractiveData, authoredState)
      case "collabSpace":
        return this.generateCollabSpaceIframeSrc(initInteractiveData, authoredState)
      default:
        return null
    }
  }

  generateCODAPIframeSrc(initInteractiveData:InitInteractiveData, authoredState:CODAPAuthoredState) {
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

    const shimParams:CodapShimParams = {
      codapUrl: `${authoredState.codapUrl}?${queryString.stringify(codapParams)}`,
      email: initInteractiveData.authInfo.email,
      interactiveId: initInteractiveData.interactive.id,
      interactiveName: initInteractiveData.interactive.name,
      classHash: initInteractiveData.publicClassHash || ""
    }

    return `../codap-shim/?${queryString.stringify(shimParams)}`
  }

  generateCollabSpaceIframeSrc(initInteractiveData:InitInteractiveData, authoredState:CollabSpaceAuthoredState) {
    if (this.state.needGroup && !this.state.selectedGroup) {
      return null
    }
    const optionalGroup = this.state.group ? `_${this.state.group}` : ""
    const session = `${initInteractiveData.publicClassHash}${optionalGroup}`
    return `${authoredState.collabSpaceUrl}#sessionTemplate=${authoredState.session}&session=${session}`
  }

  getGroupRootKey() {
    const {initInteractiveData} = this.state
    if (!initInteractiveData) {
      return null
    }
    return `classes/${initInteractiveData.publicClassHash}/interactive_${initInteractiveData.interactive.id}/groups`
  }

  watchGroups() {
    const groupRootKey = this.getGroupRootKey()
    if (!groupRootKey || !this.state.initInteractiveData) {
      return
    }
    const groupsRef:FirebaseRef = firebase.database().ref(groupRootKey)

    // need class info for user names in groups
    const classInfo = new ClassInfo(this.state.initInteractiveData.classInfoUrl || "")
    classInfo.getClassInfo((err, allClassInfo) => {
      if (!err) {
        this.setState({allClassInfo: allClassInfo})
      }
    })

    groupsRef.on("value", (snapshot:FirebaseGroupSnapshot) => {
      this.setState({groups: snapshot.val()})
    })
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
      this.setupSnapshotsRef(initInteractiveData)
      this.setState({
        irsUrl: demoAPIUrl("demoInteractiveRunState"),
        initInteractiveData: initInteractiveData,
        authoredState: demo.authoredState,
        needGroup: demo.authoredState.grouped,
        iframeType: demo.authoredState.type
      }, () => {
        this.watchGroups() // depends on publicClassHash being set
        this.setState({
          src: this.generateIframeSrc() // depends on initInteractiveData to be set
        })
      })
      setTimeout(this.getInteractiveState, 10);
    })
  }

  setupNormalMode() {
    this.laraPhone = iframePhone.getIFrameEndpoint()
    this.laraPhone.addListener('initInteractive', (initInteractiveData:InitInteractiveData) => {
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

      this.setupSnapshotsRef(initInteractiveData)

      this.setState({
        irsUrl: initInteractiveData.interactiveStateUrl,
        initInteractiveData: initInteractiveData,
        authoredState: authoredState,
        needGroup: authoredState ? authoredState.grouped : false,
        iframeType: authoredState ? authoredState.type : null
      }, () => {
        this.watchGroups() // depends on publicClassHash being set
        this.setState({
          src: this.generateIframeSrc() // depends on initInteractiveData to be set
        })
      })

      if (initInteractiveData.interactiveStateUrl)  {
        setTimeout(this.getInteractiveState, 1000)
      }
    })
    this.laraPhone.addListener('getInteractiveState', () => {
      if (this.state.iframeType === "codap") {
        if (this.innerIframePhone) {
          this.innerIframePhone.post('cfm::autosave')
        }
      }
      else if (this.laraPhone) {
        this.laraPhone.post('interactiveState', 'nochange');
      }
    });
    this.laraPhone.initialize();
    this.laraPhone.post('supportedFeatures', {
      apiVersion: 1,
      features: {
        authoredState: true,
        interactiveState: true
      }
    })
  }

  setupSnapshotsRef(initInteractiveData:InitInteractiveData) {
    this.setState({snapshotsRef: firebase.database().ref(`classes/${initInteractiveData.publicClassHash}/snapshots/interactive_${initInteractiveData.interactive.id}`)})
  }

  componentDidUpdate() {
    if (this.state.authoring) {
      this.refs.laraSharedUrl.focus()
    }
  }

  waitForInnerIframe(fn:Function) {
    if (this.innerIframePhone) {
      fn()
    }
    else {
      setTimeout(() => this.waitForInnerIframe(fn), 10)
    }
  }

  sendCopyUrl(copyUrl:string) {
    this.waitForInnerIframe(() => {
      const copyUrlMessage:SetCopyUrlMessage = {copyUrl}
      this.innerIframePhone.post(SetCopyUrlMessageName, copyUrlMessage)
    })
  }

  mergeIntoDocument(representation:Representation) {
    this.waitForInnerIframe(() => {
      const mergeIntoDocumentMessage:MergeIntoDocumentMessage = {representation}
      this.innerIframePhone.post(MergeIntoDocumentMessageName, mergeIntoDocumentMessage)
    })
  }

  copyToClipboard(representation:Representation) {
    this.waitForInnerIframe(() => {
      const copyToClipboardMessage:CopyToClipboardMessage = {representation}
      this.innerIframePhone.post(CopyToClipboardMessageName, copyToClipboardMessage)
    })
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
            let copyUrl = null
            const json = JSON.parse(res.text)
            if (json && json.raw_data) {
              const rawData = JSON.parse(json.raw_data)
              if (rawData && rawData.docStore && rawData.docStore.accessKeys && rawData.docStore.accessKeys.readOnly && this.state.authoredState) {
                if (this.state.authoredState.type === "codap") {
                  copyUrl = `${this.state.authoredState.docStoreUrl}/v2/documents?source=${rawData.docStore.recordid}&accessKey=RO::${rawData.docStore.accessKeys.readOnly}`
                  this.sendCopyUrl(copyUrl)
                }
              }
            }
            return
          }
          catch (e) {}
          setTimeout(this.getInteractiveState, 1000)
        }
      });
  }

  submitAuthoringInfo(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      const authoredState = parseCODAPUrlIntoAuthoredState(this.refs.laraSharedUrl.value, false) // TODO: add grouped form element
      this.setState({authoringError: null})
      this.laraPhone.post('authoredState', authoredState)
    }
    catch (e) {
      this.setState({authoringError: e.message})
    }
  }

  renderAuthoring():JSX.Element {
    const inputStyle = {width: "100%"}
    const errorStyle = {color: "#f00", marginTop: 10, marginBottom: 10}
    const {authoredState} = this.state
    const url = (authoredState ? (authoredState.type === "codap" ? authoredState.laraSharedUrl : authoredState.collabSpaceUrl) : "") || ""
    return <form onSubmit={this.submitAuthoringInfo}>
             {this.state.authoringError ? <div style={errorStyle}>{this.state.authoringError}</div> : null}
             <label htmlFor="laraSharedUrl">Shared URL from LARA tab in CODAP</label>
             <input type="text" id="laraSharedUrl" ref="laraSharedUrl" style={inputStyle} defaultValue={url} />
             <input type="submit" value="Save" />
           </form>
  }

  handlePublish(callback:HandlePublishCallback) {
    this.handlePublishCallback = callback
    this.sharingParent.sendPublish()
  }

  cleanSnapshotForFirebase(snapshot:PublishResponse) {
    delete snapshot.context
    delete snapshot.createdAt
    if (snapshot.children) {
      snapshot.children.forEach((child) => this.cleanSnapshotForFirebase(child))
    }
  }

  receivePublish(snapshot:PublishResponse) {
    this.cleanSnapshotForFirebase(snapshot)

    if (this.state.snapshotsRef && this.state.initInteractiveData) {
      const snapshotGroup:FirebaseSavedSnapshotGroup|null = this.state.group && this.state.groups[this.state.group] ? {id: this.state.group, members: this.state.groups[this.state.group].users || {}} : null
      const pushedShapshot:FirebaseSavedSnapshot = {
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        user: this.state.initInteractiveData.authInfo.email,
        group: snapshotGroup,
        snapshot
      }
      this.state.snapshotsRef.push().set(pushedShapshot)
    }

    if (this.handlePublishCallback) {
      this.handlePublishCallback(null, snapshot)
      this.handlePublishCallback = null
    }
  }

  iframeLoaded() {
    const {initInteractiveData} = this.state
    if (initInteractiveData) {
      const context:Context = {
        // TODO
        protocolVersion: "1.0.0",
        user: {displayName: "noah", id:"1"},
        id: "noah",
        group: {displayName: "noahs group", id:"1"},
        offering: {displayName: "offering_id", id: "1"},
        clazz:  {displayName: "clazz_id", id: "1"},
        localId: "x",
        requestTime: new Date().toISOString()
      }
      this.innerIframePhone = iframePhone.ParentEndpoint(this.refs.iframe)
      this.innerIframePhone.addListener('cfm::autosaved', () => {
        if (this.laraPhone) {
          this.laraPhone.post('interactiveState', 'nochange')
        }
      })

      this.sharingParent = new SharingParent({
        phone: this.innerIframePhone,
        context: context,
        callback: this.receivePublish.bind(this)
      })
    }
  }

  setLightboxImageUrl(url:string|null) {
    this.setState({lightboxImageUrl: url === this.state.lightboxImageUrl ? null : url})
  }

  clearLightbox() {
    this.setLightboxImageUrl(null)
  }

  renderLightbox() {
    if (!this.state.lightboxImageUrl) {
      return null
    }
    return (
      <div className="image-lightbox" onClick={this.clearLightbox}>
        <div className="image-lightbox-background" />
        <div className="image-lightbox-image">
          <div>
            <img src={this.state.lightboxImageUrl} />
          </div>
        </div>
      </div>
    )
  }

  renderIFrame():JSX.Element|null {
    if (this.state.src && this.state.initInteractiveData) {
      const iframeApi:IFrameApi = {
        changeGroup: this.changeGroup,
        handlePublish: this.handlePublish,
        setLightboxImageUrl: this.setLightboxImageUrl,
        copyToClipboard: this.copyToClipboard,
        mergeIntoDocument: this.mergeIntoDocument
      }
      return <div>
              <div id="iframe-container">
                <iframe ref="iframe" src={this.state.src} onLoad={this.iframeLoaded} sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"></iframe>
                {this.renderLightbox()}
              </div>
              <IFrameSidebar
                initInteractiveData={this.state.initInteractiveData}
                viewOnlyMode={false}
                group={this.state.group}
                groups={this.state.groups}
                snapshotsRef={this.state.snapshotsRef}
                iframeApi={iframeApi}
              />
            </div>
    }
    return null
  }

  changeGroup() {
    if (confirm("Are you sure you want to change your group?")) {
      this.setState({
        selectedGroup: false
      })
      if (this.groupUserRef) {
        const inactiveUser:FirebaseGroupUser = {active: false}
        this.groupUserRef.set(inactiveUser)
      }
    }
  }

  submitSelectGroup(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const group = parseInt(this.refs.group.value, 10)

    const groupRootKey = this.getGroupRootKey()
    const {initInteractiveData} = this.state
    if (initInteractiveData && groupRootKey) {

      const activeUser:FirebaseGroupUser = {active: true}
      const inactiveUser:FirebaseGroupUser = {active: false}

      if (this.groupUserRef) {
        this.groupUserRef.set(inactiveUser)
      }

      this.groupUserRef = firebase.database().ref(`${groupRootKey}/${group}/users/${escapeFirebaseKey(initInteractiveData.authInfo.email)}`)
      this.groupUserRef.set(activeUser)
      this.groupUserRef.onDisconnect().set(inactiveUser)
    }

    this.setState({
      group: group,
      selectedGroup: true
    }, () => {
      // generateIframeSrc depends on group and selectedGroup being set...
      this.setState({
        src: this.generateIframeSrc()
      })
    })
  }

  renderSelectGroup():JSX.Element {
    const options = this.groupArray.map((group) => {
      let suffix = ""
      const {allClassInfo} = this.state
      if (allClassInfo) {
        const users = this.state.groups[group] ? this.state.groups[group].users : {}
        const names:string[] = []
        Object.keys(users).map((email) => {
          const user = users[email]
          const {fullname} = allClassInfo.userNames[email]
          names.push(`${fullname}${!user.active ? " (inactive)" : ""}`)
        })
        if (names.length > 0) {
          suffix = `: ${names.join(", ")}`
        }
      }
      return <option value={group} key={group}>Group {group}{suffix}</option>
    })
    return <div>
      <div id="select-group">
        <form onSubmit={this.submitSelectGroup}>
          <select ref="group">{options}</select>
          <input type="submit" value="Select Group" />
        </form>
      </div>
    </div>
  }

  render() {
    if (this.state.authoring) {
      return this.renderAuthoring()
    }
    if (this.state.authoredState) {
      if (this.state.needGroup && !this.state.selectedGroup) {
        return this.renderSelectGroup()
      }
      return this.renderIFrame()
    }
    return null
  }
}

export function parseCODAPUrlIntoAuthoredState(url:string, grouped:boolean) {
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
    type: "codap",
    grouped: grouped,
    laraSharedUrl: url,
    docStoreUrl: matchProtocol(urlMatches[1].replace(/\/+$/, "")), // remove trailing slashes
    codapUrl: matchProtocol(codapUrl),
    codapParams: codapParams,
    documentId: urlMatches[2]
  }

  return authoredState
}

export function parseCollaborationSpaceUrlIntoAuthoredState(url:string, grouped:boolean):AuthoredState {
  const [baseUrl, hash, ...rest] = url.split("#")
  const params = queryString.parse(hash || "")
  return {
    type: "collabSpace",
    grouped: grouped,
    collabSpaceUrl: baseUrl,
    session: params.session
  }
}