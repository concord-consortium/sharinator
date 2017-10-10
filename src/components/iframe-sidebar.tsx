import * as React from "react";
import {InitInteractiveData, AuthoredState, CODAPAuthoredState, CollabSpaceAuthoredState, HandlePublishFunction, IFrameApi} from "./iframe"
import {ExportLibrary} from "./export-library"
import {FirebaseInteractive, FirebaseUserInteractive, FirebaseDataContextRefMap, FirebaseData, FirebaseDataContext, UserName, Window} from "./types"
import {ClassInfo, GetUserName} from "./class-info"
import {SuperagentError, SuperagentResponse, Firebase, FirebaseGroupMap, FirebaseRef, FirebaseSavedSnapshot, FirebaseSnapshotSnapshots} from "./types"
import escapeFirebaseKey from "./escape-firebase-key"
import {PublishResponse, Representation, CODAP, CODAPDataContext, Jpeg, Png, Gif, Text, LaunchApplication, CollabSpace} from "cc-sharing"
import * as refs from "./refs"

const queryString = require("query-string")
const base64url = require("base64-url")
const superagent = require("superagent")

declare var firebase: Firebase

export interface IFrameSidebarProps {
  initInteractiveData: InitInteractiveData
  viewOnlyMode: boolean
  group: number
  groups: FirebaseGroupMap
  iframeApi: IFrameApi
  authDomain: string
}

export interface IFrameSidebarState {
  error: string|null
  classHash: string|null
  publishing: boolean
  publishingError: string|null
  publishingStatus: string|null
  myEmail: string
  initTimedout: boolean
  userSnapshots: UserSnapshot[]
  classInfoUrl: string
  snapshotsRef: FirebaseRef|null
}

export interface UserSnapshot {
  number: number
  name: UserName
  userSnapshot: FirebaseSavedSnapshot
}

export interface UserSnapshotMap {
  [s: string]: UserSnapshot
}

export interface UserSnapshotRepresentationProps {
  representation: Representation
  iframeApi: IFrameApi
  classInfoUrl: string
}

export interface UserSnapshotRepresentationState {
  expanded: boolean
}

export class UserSnapshotRepresentation extends React.Component<UserSnapshotRepresentationProps, UserSnapshotRepresentationState> {
  constructor(props: UserSnapshotRepresentationProps) {
    super(props)
    this.toggle = this.toggle.bind(this)
    this.setLightboxImageUrl = this.setLightboxImageUrl.bind(this)
    this.mergeIntoDocument = this.mergeIntoDocument.bind(this)
    this.copyToClipboard = this.copyToClipboard.bind(this)
    this.state = {
      expanded: false
    }
  }

  setLightboxImageUrl() {
    if (this.props.iframeApi.setLightboxImageUrl) {
      this.props.iframeApi.setLightboxImageUrl(this.props.representation.dataUrl)
    }
  }

  mergeIntoDocument() {
    if (this.props.iframeApi.mergeIntoDocument) {
      this.props.iframeApi.mergeIntoDocument(this.props.representation)
    }
  }

  copyToClipboard() {
    if (this.props.iframeApi.copyToClipboard) {
      this.props.iframeApi.copyToClipboard(this.props.representation)
    }
  }

  renderImage(representation:Representation) {
    return <img src={representation.dataUrl} onClick={this.setLightboxImageUrl} />
  }

  renderCODAPOptions(representation:Representation) {
    if (this.state.expanded) {
      const classUrl = this.props.classInfoUrl
      const href = `../dashboard/?class=${encodeURIComponent(classUrl)}&representation=${encodeURIComponent(representation.dataUrl)}`

      return (
        <div className="user-snapshot-item-representation-item-options">
          <a className="user-snapshot-item-representation-item-option-item" href={href} target="_blank">Open In Dashboard</a>
        </div>
      )
    }
    return null
  }

  renderCODAP(representation:Representation) {
    return (
      <div>
        <div className="user-snapshot-item-representation-item-name" onClick={this.toggle}>Document</div>
        {this.renderCODAPOptions(representation)}
      </div>
    )
  }

  renderCODAPDataContextOptions() {
    if (this.state.expanded) {
      return (
        <div className="user-snapshot-item-representation-item-options">
          <div className="user-snapshot-item-representation-item-option-item" onClick={this.mergeIntoDocument}>Merge Into My Document</div>
          <div className="user-snapshot-item-representation-item-option-item" onClick={this.copyToClipboard}>Copy To Clipboard</div>
        </div>
      )
    }
    return null
  }

  renderCODAPDataContext(representation:Representation) {
    return (
      <div>
        <div className="user-snapshot-item-representation-item-name" onClick={this.toggle}>{representation.name}</div>
        {this.renderCODAPDataContextOptions()}
      </div>
    )
  }

  toggle() {
    this.setState({expanded: !this.state.expanded})
  }

  renderText(representation:Representation) {
    return <div>{representation.dataUrl}</div>
  }

  renderUnknown(representation:Representation) {
    return <div>UKNOWN: {representation.type.type}</div>
  }

  render() {
    const {representation} = this.props
    const {type} = representation

    let renderedRepresentation:JSX.Element|null = null

    switch (type.type) {
      case Jpeg.type:
      case Gif.type:
      case Png.type:
        renderedRepresentation = this.renderImage(representation)
        break
      case Text.type:
        renderedRepresentation = this.renderText(representation)
        break
      case CODAP.type:
        renderedRepresentation = this.renderCODAP(representation)
        break
      case CODAPDataContext.type:
        renderedRepresentation = this.renderCODAPDataContext(representation)
        break
      default:
        renderedRepresentation = this.renderUnknown(representation)
        break
    }

    return (
      <div className="user-snapshot-item-representation-item">
        {renderedRepresentation}
      </div>
    )
  }
}

export interface UserSnapshotItemProps {
  parents: PublishResponse[]
  snapshot: PublishResponse
  iframeApi: IFrameApi
  classInfoUrl: string
  name: UserName
  number: number
}

export interface UserSnapshotItemState {
  withinCollabSpace: boolean
  parentsPlusMe: PublishResponse[]
}

export class UserSnapshotItem extends React.Component<UserSnapshotItemProps, UserSnapshotItemState> {
  constructor(props: UserSnapshotItemProps) {
    super(props)
    const withinCollabSpace = this.props.parents.find((parent) => parent.application.type ? parent.application.type.type == CollabSpace.type : false)
    this.state = {
      withinCollabSpace: !!withinCollabSpace,
      parentsPlusMe: this.props.parents.concat(this.props.snapshot)
    }
  }

  renderRepresentations() {
    return (
      <div className="user-snapshot-item-representations">
        {this.props.snapshot.representations.map((representation, index) => <UserSnapshotRepresentation key={index} classInfoUrl={this.props.classInfoUrl} representation={representation} iframeApi={this.props.iframeApi} />)}
      </div>
    )
  }

  renderChildItems():JSX.Element[] {
    const {snapshot} = this.props
    if (snapshot.children) {
      return snapshot.children.map((child, i) => <UserSnapshotItem key={i} snapshot={child} parents={this.state.parentsPlusMe} iframeApi={this.props.iframeApi} classInfoUrl={this.props.classInfoUrl} name={this.props.name} number={this.props.number} />)
    }
    return []
  }

  openInCollabSpace(application:LaunchApplication) {
    if (this.props.iframeApi.openInCollabSpace) {
      const title = `${this.props.name.fullname} (#${this.props.number}): ${application.name}`
      this.props.iframeApi.openInCollabSpace(title, application)
    }
  }

  renderApplicationName(application:LaunchApplication) {
    const classUrl = this.props.classInfoUrl
    const href = `../dashboard/?class=${encodeURIComponent(classUrl)}&application=${encodeURIComponent(application.launchUrl)}`

    if (this.state.withinCollabSpace) {
      return (
        <div>
          <div className="user-snapshot-item-application-item-name">{application.name}</div>
          <div className="user-snapshot-item-application-item-options">
            <div className="user-snapshot-item-application-item-option-item" onClick={() => this.openInCollabSpace(application)}>Add to Collaboration Space</div>
            <a className="user-snapshot-item-application-item-option-item" href={href} target="_blank">Open in Dashboard</a>
          </div>
        </div>
      )
    }

    return <a className="user-snapshot-item-application-name" href={href} target="_blank">{application.name}</a>
  }

  render() {
    const {snapshot} = this.props

    if (this.props.parents.length !== 0) {
      return (
        <div className="user-snapshot-item">
          <div className="user-snapshot-item-application">
            {this.renderApplicationName(snapshot.application)}
            {this.renderRepresentations()}
            {this.renderChildItems()}
          </div>
        </div>
      )
    }

    return (
      <div className="user-snapshot-item">
        {this.renderRepresentations()}
        {this.renderChildItems()}
      </div>
    )
  }
}

export interface UserRootSnapshotItemProps {
  userSnapshot: UserSnapshot
  iframeApi: IFrameApi
  classInfoUrl: string
}

export interface UserRootSnapshotItemState {
}

export class UserRootSnapshotItem extends React.Component<UserRootSnapshotItemProps, UserRootSnapshotItemState> {
  constructor(props: UserRootSnapshotItemProps) {
    super(props)
    this.state = {
    }
  }

  renderCreatedAt() {
    const {number, userSnapshot} = this.props.userSnapshot
    const now = (new Date()).getTime()
    const diff = Math.max(now - userSnapshot.createdAt, 0) / 1000
    const plural = (count:number) => count === 1 ? "" : "s"
    let when:string = "Just now"
    if (diff > 59) {
      if (diff < 60*60) {
        const minutes = Math.round(diff/60)
        when = `${minutes} minute${plural(minutes)} ago`
      }
      else if (diff < 60*60*24) {
        const hours = Math.round(diff/(60*60))
        when = `${hours} hour${plural(hours)} ago`
      }
      else {
        const days = Math.round(diff/(60*60*24))
        when = `${days} day${plural(days)} ago`
      }
    }
    return <div className="user-snapshot-created-at">#{number} - {when}</div>
  }

  render() {
    const {name, number, userSnapshot} = this.props.userSnapshot
    const {createdAt, snapshot} = userSnapshot
    return (
      <div className="user-snapshot-root-item">
        <div className="user-snapshot-root-item-user">{name.fullname}</div>
        <UserSnapshotItem snapshot={snapshot} parents={[]} iframeApi={this.props.iframeApi} classInfoUrl={this.props.classInfoUrl} name={name} number={number} />
        {this.renderCreatedAt()}
      </div>
    )
  }
}

export class IFrameSidebar extends React.Component<IFrameSidebarProps, IFrameSidebarState> {
  private interactiveRef:any // TODO
  private userInteractivesRef:any // TODO
  private classInfo:ClassInfo

  constructor(props: IFrameSidebarProps) {
    super(props)

    this.onPublish = this.onPublish.bind(this)
    this.state = {
      error: null,
      classHash: null,
      publishing: false,
      publishingError: null,
      publishingStatus: null,
      myEmail: this.props.initInteractiveData.authInfo.email,
      initTimedout: false,
      userSnapshots: [],
      classInfoUrl: this.props.initInteractiveData.classInfoUrl || "",
      snapshotsRef: null
    }

    this.classInfo = new ClassInfo(this.props.initInteractiveData.classInfoUrl || "")

    setTimeout(() => {
      this.setState({initTimedout: !this.state.classHash})
    }, 5000)
  }

  componentWillMount() {
    this.classInfo.getClassInfo((err, info) => {
      if (err) {
        this.setState({error: err})
        return
      }

      this.setState({
        classHash: info.classHash,
        snapshotsRef: refs.makeSnapshotsRef(this.props.authDomain, info.classHash, this.props.initInteractiveData.interactive.id)
      }, () => {
        this.listenForSnapshots()
      })
    })
  }

  sortUserSnapshots(a: UserSnapshot, b: UserSnapshot):number {
    if (!a.name || !b.name) { return 0 }
    if (a.name._firstName < b.name._firstName) { return -1 }
    if (a.name._firstName > b.name._firstName) { return 1 }
    if (a.name._lastName < b.name._lastName) { return -1 }
    if (a.name._lastName > b.name._lastName) { return 1 }
    return 0;
  }

  listenForSnapshots() {
    const {snapshotsRef} = this.state
    if (snapshotsRef) {
      snapshotsRef.on("value", (snapshot:FirebaseSnapshotSnapshots) => {

        const snapshotMap = snapshot.val() || {}
        const userSnapshotMap:UserSnapshotMap = {}
        let usernameNotFound = false
        Object.keys(snapshotMap).forEach((snapshot) => {
          const savedSnapshot = snapshotMap[snapshot]
          const user = this.classInfo.getUserName(savedSnapshot.user)
          usernameNotFound = usernameNotFound || !user.found
          if (!userSnapshotMap[savedSnapshot.user]) {
            userSnapshotMap[savedSnapshot.user] = {
              number: 1,
              name: user.name,
              userSnapshot: savedSnapshot
            }
          }
          else {
            userSnapshotMap[savedSnapshot.user].number++
            if (userSnapshotMap[savedSnapshot.user].userSnapshot.createdAt < savedSnapshot.createdAt) {
              userSnapshotMap[savedSnapshot.user].userSnapshot = savedSnapshot
            }
          }
        })

        const userSnapshots:UserSnapshot[] = Object.keys(userSnapshotMap).map((user) => {
          return userSnapshotMap[user]
        })
        this.setState({userSnapshots: userSnapshots.sort(this.sortUserSnapshots)})

        if (usernameNotFound) {
          this.classInfo.getStudentNames((err, names) => {
            if (!err) {
              this.state.userSnapshots.forEach((userSnapshot) => {
                userSnapshot.name = this.classInfo.getUserName(userSnapshot.userSnapshot.user).name
              })
              this.setState({userSnapshots: this.state.userSnapshots.sort(this.sortUserSnapshots)})
            }
          })
        }
      })
    }
  }

  onPublish(e:React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    if (!this.props.initInteractiveData || !this.props.iframeApi.handlePublish) {
      return
    }

    this.setState({
      publishing: true,
      publishingStatus: "Publishing..."
    })

    this.props.iframeApi.handlePublish((err) => {
      if (err) {
        this.setState({
          publishing: false,
          publishingError: err.toString()
        })
      }
      else {
        this.setState({
          publishing: false,
          publishingStatus: "Published!"
        })
        const clearPublishingStatus = () => {
          this.setState({
            publishingStatus: null
          })
        }
        setTimeout(clearPublishingStatus, 2000)
      }
    })
  }

  renderPublishingError() {
    if (!this.state.publishingError) {
      return null
    }
    return <div className="error">{this.state.publishingError}</div>
  }

  renderPublishingStatus() {
    if (!this.state.publishingStatus) {
      return null
    }
    return <div className="status">{this.state.publishingStatus}</div>
  }

  renderUserSnapshots() {
    if (!this.state.userSnapshots) {
      return null
    }
    return (
      <div className="user-snapshot-items">
        {this.state.userSnapshots.map((userSnapshot) => <UserRootSnapshotItem key={userSnapshot.userSnapshot.user} userSnapshot={userSnapshot} iframeApi={this.props.iframeApi} classInfoUrl={this.state.classInfoUrl}/> )}
      </div>
    )
  }

  renderGroupInfo() {
    if (!this.props.group) {
      return null;
    }
    const users = this.props.groups && this.props.groups[this.props.group] ? this.props.groups[this.props.group].users : {}
    const names:string[] = []
    Object.keys(users).map((email) => {
      const user = users[email]
      const {fullname} = this.classInfo.getUserName(email).name
      names.push(`${fullname}${!user.active ? " (inactive)" : ""}`)
    })
    return (
      <div className="groupname-header">
        <div  className="groupname-header-name" title="Click to change group" onClick={this.props.iframeApi.changeGroup}>Group {this.props.group}</div>
        <div>{names.join(", ")}</div>
      </div>
    )
  }

  renderUsernameHeader() {
    if (this.props.viewOnlyMode) {
      return null
    }
    var me = this.classInfo.getUserName(this.state.myEmail)
    var username = me.found ? me.name : null;
    if (!username) {
      return null;
    }
    return <div className="username-header">
             {username.fullname}
             {this.renderGroupInfo()}
           </div>
  }

  renderButtons() {
    if (this.props.viewOnlyMode) {
      return null
    }
    return (
      <div className="buttons">
        <button className="button button-primary" onClick={this.onPublish} disabled={this.state.publishing}>Publish</button>
      </div>
    )
  }

  render() {
    if (this.state.error) {
      return <div id="iframe-sidebar">{this.state.error}</div>
    }

    if (!this.state.classHash) {
      return <div id="iframe-sidebar">
               <div className="sidebar-loading">
                Waiting for user info...
               </div>
               {this.state.initTimedout ? <div className="sidebar-loading-note">NOTE: This sidebar will not be active when run in preview mode.</div> : null}
             </div>
    }

    return <div id="iframe-sidebar">
             { this.renderUsernameHeader() }
             { this.renderButtons() }
             { this.renderPublishingError() }
             { this.renderPublishingStatus() }
             { this.renderUserSnapshots() }
           </div>
  }
}