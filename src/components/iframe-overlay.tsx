import * as React from "react";
import {InitInteractiveData, AuthoredState} from "./iframe"
import {FirebaseInteractive} from "./types"
import {ClassInfoResultResponse} from "./class-info"
import escapeFirebaseKey from "./escape-firebase-key"

const queryString = require("query-string")
const base64url = require("base64-url")
const superagent = require("superagent")

declare var firebase: any;  // @types/firebase is not Firebase 3

export interface IFrameOverlayProps {
  initInteractiveData: InitInteractiveData
  authoredState: AuthoredState
  copyUrl: string|null
}

export interface IFrameOverlayState {
  privateClassHash: string|null
  loadingClassInfo: boolean
  publishing: boolean
  publishingError: string|null
  publishingStatus: string|null
}

interface CopyResults {
  status: string
  valid: boolean
  id: number
  readAccessKey: string
  readWriteAccessKey: string
}

export class IFrameOverlay extends React.Component<IFrameOverlayProps, IFrameOverlayState> {
  private interactiveRef:any
  private studentInteractivesRef:any

  constructor(props: IFrameOverlayProps) {
    super(props)

    this.onPublish = this.onPublish.bind(this)
    this.state = {
      privateClassHash: null,
      loadingClassInfo: false,
      publishing: false,
      publishingError: null,
      publishingStatus: null
    }
  }

  componentDidMount() {
    if (!this.state.privateClassHash && !this.state.loadingClassInfo) {
      this.setState({loadingClassInfo: true})
      superagent
        .get(this.props.initInteractiveData.classInfoUrl)
        .withCredentials()
        .set('Accept', 'application/json')
        .end((err:any, res:any) => {
          if (!err) {
            try {
              const result:ClassInfoResultResponse = JSON.parse(res.text)
              if (result.response_type !== "ERROR") {
                this.setState({
                  loadingClassInfo: false,
                  privateClassHash: result.private_class_hash
                })
              }
            }
            catch (e) {}
          }
        });
    }
  }

  onPublish(e:React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    this.setState({
      publishing: true,
      publishingStatus: "Publishing..."
    })

    const data = this.props.initInteractiveData
    const classroomKey = `classes/${this.state.privateClassHash}`
    const interactiveKey = `${classroomKey}/interactives/interactive_${data.interactive.id}`
    const studentInteractivesKey = `${classroomKey}/students/${escapeFirebaseKey(data.authInfo.email)}/interactives/interactive_${data.interactive.id}`

    superagent
      .post(this.props.copyUrl)
      .set('Accept', 'application/json')
      .end((err:any, res:any) => {
        this.setState({publishing: false})

        if (!err && this.props.authoredState) {
          try {
            const copyResults:CopyResults = JSON.parse(res.text)
            if (copyResults && copyResults.id && copyResults.readAccessKey) {
              const laraParams = {
                recordid: copyResults.id,
                accessKeys: {
                  readOnly: copyResults.readAccessKey
                }
              }
              const codapParams = {
                componentMode: "yes",
                documentServer: this.props.authoredState.docStoreUrl
              }
              const url = `${this.props.authoredState.codapUrl}?${queryString.stringify(codapParams)}#file=lara:${base64url.encode(JSON.stringify(laraParams))}`

              // save the interactive name (noop after it is first set)
              const firebaseInteractive:FirebaseInteractive = {name: data.interactive.name}
              this.interactiveRef = this.interactiveRef || firebase.database().ref(interactiveKey)
              this.interactiveRef.set(firebaseInteractive)

              // push the copy
              this.studentInteractivesRef = this.studentInteractivesRef || firebase.database().ref(studentInteractivesKey)
              this.studentInteractivesRef.push().set({
                url: url,
                createdAt: firebase.database.ServerValue.TIMESTAMP
              })
            }
            else {
              err = "Invalid response from copy document call"
            }
          }
          catch (e) {
            err = e
          }
        }

        this.setState({
          publishingError: err ? err.toString() : null,
          publishingStatus: !err ? "Published!" : null
        })

        if (!err) {
          const clearPublishingStatus = () => {
            this.setState({
              publishingStatus: null
            })
          }
          setTimeout(clearPublishingStatus, 2000)
        }
      });
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

  render() {
    if (!this.props.initInteractiveData || !this.state.privateClassHash) {
      return null
    }
    const href = `../dashboard/?class=${base64url.encode(this.props.initInteractiveData.classInfoUrl)}`

    return <div id="iframe-overlay">
             <div id="background"></div>
             <div id="buttons">
               <button className="button button-primary" onClick={this.onPublish} disabled={this.state.publishing}>Publish</button>
               <a className="button button-primary" href={href} target="_blank">View</a>
             </div>
             { this.renderPublishingError() }
             { this.renderPublishingStatus() }
           </div>
  }
}