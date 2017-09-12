import * as React from "react";
import {SharingClient, SharableApp, Representation, Text, Context} from "cc-sharing"
const queryString = require("query-string")
import {Firebase, IFramePhone, FirebaseInteractive, FirebaseUserInteractive, FirebaseDataContextRefMap, FirebaseData, FirebaseDataContext, UserName, Window} from "./types"
import {mergedDataContextName, CopyResults} from "./iframe-sidebar"
import {SuperagentError, SuperagentResponse} from "./types"
import {ClassInfo, GetUserName} from "./class-info"
import escapeFirebaseKey from "./escape-firebase-key"
import {InitInteractiveData, AuthoredState, CODAPAuthoredState, CollabSpaceAuthoredState, HandlePublishFunction} from "./iframe"

const superagent = require("superagent")
const base64url = require("base64-url")

declare var iframePhone: IFramePhone
declare var firebase: Firebase

type ResolvePublish = (value?: Representation[] | PromiseLike<Representation[]> | undefined) => void
type RejectPublish = (reason?: any) => void

export type SetCopyUrlMessage = {
  type: "setCopyUrl",
  copyUrl: string
}

export interface CODAPCommand {
  message: string
}

export type CODAPPostData = any   // TODO
export type CODAPListenerData = any // TODO

export interface CODAPPhone {
   addListener: (command: string, callback:(data:CODAPListenerData)=>void) => void
   post: (message: string, data:CODAPPostData) => void
   initialize: () => void
   call: (requests:any, callback?: (results:any) => void) => void // TODO
}

export type CODAPParams = any  // TODO


export interface CodapShimParams {
  codapUrl: string
  email: string
  interactiveId: number
  interactiveName: string
  classHash: string
}

export interface CodapShimProps {
}

export interface CodapShimState {
  codapUrl: string
  email: string|null,
  classHash: string|null
  interactiveId: number|null
  interactiveName: string|null
  copyUrl: string|null
}

export class CodapShim extends React.Component<CodapShimProps, CodapShimState> {
  private codapPhone: CODAPPhone|null = null
  private sharinatorPrefix = /^Sharinator/
  private cfmPrefix = /^cfm::/
  private iframeCanAutosave = false
  private interactiveRef:any // TODO
  private userInteractivesRef:any // TODO
  private classInfo:ClassInfo
  private classroomRef:any // TODO

  constructor(props: CodapShimProps) {
    super(props)

    this.handlePublish = this.handlePublish.bind(this)
    this.iframeLoaded = this.iframeLoaded.bind(this)
    this.codapPhoneHandler = this.codapPhoneHandler.bind(this)

    const query:CodapShimParams = queryString.parse(location.search)

    const app:SharableApp = {
      application: {
        launchUrl: window.location.toString(),
        name: "CODAP (shim)"
      },
      getDataFunc: (context) => {
        return new Promise(this.handlePublish)
      }
    }

    const phone = iframePhone.getIFrameEndpoint();
    phone.initialize();
    const sharingClient = new SharingClient({phone, app})

    this.state = {
      codapUrl: query.codapUrl,
      email: query.email,
      interactiveId: query.interactiveId,
      interactiveName: query.interactiveName,
      classHash: query.classHash,
      copyUrl: null
    }
  }

  refs: {
    iframe: HTMLIFrameElement
  }

  componentWillMount() {
    window.addEventListener("message", (e:MessageEvent) => {
      const message = e.data || {}
      if (e.source === window.parent) {
        console.log("CHILD MESSAGE", e.data)
        const copyUrlMessage = message as SetCopyUrlMessage
        if (copyUrlMessage.type === "setCopyUrl" ) {
          this.setState({copyUrl: copyUrlMessage.copyUrl})
        }
        else if (this.refs.iframe && this.refs.iframe.contentWindow && !this.sharinatorPrefix.test(message.type)) {
          this.refs.iframe.contentWindow.postMessage(e.data, "*")
        }
      }
      //else if (this.refs.iframe && (e.source === this.refs.iframe.contentWindow) && this.cfmPrefix.test(message.type)) {
      //  console.log("PARENT MESSAGE", e.data)
      //  window.parent.postMessage(e.data, "*")
      //}
    })
  }

  handlePublish(resolve:ResolvePublish, reject:RejectPublish) {
    const {interactiveId, email, interactiveName} = this.state
    if (!interactiveId || (email === null) || (interactiveName === null)) {
      reject("Not ready to publish")
      return
    }

    const classroomKey = `classes/${this.state.classHash}`
    const safeUserKey = escapeFirebaseKey(email)
    const interactiveKey = `${classroomKey}/interactives/interactive_${interactiveId}`
    const userInteractivesKey = `${classroomKey}/users/${safeUserKey}/interactives/interactive_${interactiveId}`
    const userDataContextsKey = `dataContexts/${this.state.classHash}/${safeUserKey}/interactive_${interactiveId}`

    superagent
      .post(this.state.copyUrl)
      .set('Accept', 'application/json')
      .end((err:SuperagentError, res:SuperagentResponse) => {
        if (err) {
          reject(err)
        }
        else {
          try {
            const copyResults:CopyResults = JSON.parse(res.text)
            if (copyResults && copyResults.id && copyResults.readAccessKey) {
              const laraParams = {
                recordid: copyResults.id,
                accessKeys: {
                  readOnly: copyResults.readAccessKey
                }
              }
              const documentUrl = `${this.state.codapUrl}?#file=lara:${base64url.encode(JSON.stringify(laraParams))}`

              this.saveDataContexts(userDataContextsKey, (err, dataContexts) => {
                if (err) {
                  throw err
                }

                // save the interactive name (noop after it is first set)
                const firebaseInteractive:FirebaseInteractive = {name: interactiveName}
                this.interactiveRef = this.interactiveRef || firebase.database().ref(interactiveKey)
                this.interactiveRef.set(firebaseInteractive)

                // push the copy
                this.userInteractivesRef = this.userInteractivesRef || firebase.database().ref(userInteractivesKey)
                const userInteractive:FirebaseUserInteractive = {
                  createdAt: firebase.database.ServerValue.TIMESTAMP,
                  documentUrl: documentUrl,
                  dataContexts: dataContexts || {}
                }
                this.userInteractivesRef.push().set(userInteractive)

                debugger
                resolve([])
              })
            }
            else {
              reject("Invalid response from copy document call")
            }
          }
          catch (e) {
            reject(e)
          }
        }
      })
  }

  saveDataContexts(userDataContextsKey: string, callback: (err:string|null, dataContextMap?: FirebaseDataContextRefMap) => void) {
    const {codapPhone} = this
    if (!codapPhone) {
      return
    }

    codapPhone.call({
      action: 'get',
      resource: 'dataContextList'
    }, (result:any) => { // TODO
      result = result || {success: false, values: {error: "Unable to get list of data contexts!"}}
      if (!result.success) {
        return callback(result.values.error)
      }

      const dataContexts:any[] = [] // TODO
      const uniqueDataContextNames:string[] = []
      const collectionRequests:any[] = [] // TODO
      result.values.forEach((value:any) => { // TODO
        // ignore duplicate context names (generated from ill behaving DIs) and merged data contexts
        if ((uniqueDataContextNames.indexOf(value.name) !== -1) || (value.name.substr(0, mergedDataContextName.length) === mergedDataContextName)) {
          return
        }
        uniqueDataContextNames.push(value.name)

        dataContexts.push({
          name: value.name,
          title: value.title,
          collections: {},
          cases: {}
        })
        collectionRequests.push({
          action: "get",
          resource: `dataContext[${value.name}].collectionList`
        })
      })

      codapPhone.call(collectionRequests, (results:any) => { // TODO
        results = results || [{success: false, values: {error: "Unable to get list of collections!"}}]
        let error:string|null = null

        const dataContextForRequest:any[] = [] // TODO
        const collectionInfoRequests:any[] = [] // TODO
        const caseRequests:any[] = [] // TODO
        results.forEach((result:any, dataContextIndex:number) => { // TODO
          if (error || !result.success) {
            error = error || result.values.error
            return
          }
          const dataContext = dataContexts[dataContextIndex]
          result.values.forEach((value:any, requestIndex:number) => { // TODO
            dataContext.collections[value.id] = {
              name: value.name,
              title: value.title
            }
            dataContextForRequest.push(dataContext)
            collectionInfoRequests.push({
              action: "get",
              resource: `dataContext[${dataContext.name}].collection[${value.name}]`
            })
            caseRequests.push({
              action: "get",
              resource: `dataContext[${dataContext.name}].collection[${value.name}].allCases`
            })
          })
        })

        if (error) {
          return callback(error)
        }

        codapPhone.call(collectionInfoRequests, (results:any) => { // TODO
          results = results || [{success: false, values: {error: "Unable to get collection data!"}}]
          let error:string|null = null

          results.forEach((result:any, requestIndex:number) => { // TODO
            if (error || !result.success) {
              error = error || result.values.error
              return
            }
            const dataContext = dataContextForRequest[requestIndex]
            const collection = result.values
            dataContext.collections[collection.id].parent = collection.parent ?  dataContext.collections[collection.parent].name : null
            dataContext.collections[collection.id].attrs = collection.attrs.map((attr:any) => { // TODO
              return {
                name: attr.name,
                title: attr.title,
                hidden: attr.hidden
              }
            })
          })

          codapPhone.call(caseRequests, (results:any) => { // TODO
            results = results || [{success: false, values: {error: "Unable to get case data!"}}]
            let error:string|null = null

            results.forEach((result:any, requestIndex:number) => { // TODO
              if (error || !result.success) {
                error = error || result.values.error
                return
              }

              const dataContext = dataContextForRequest[requestIndex]
              const collectionId = result.values.collection.id
              result.values.cases.forEach((_case:any) => { // TODO
                if (_case.hasOwnProperty('caseIndex')) {
                  dataContext.cases[_case.case.id] = {
                    parent: _case.case.parent || null,
                    values: _case.case.values,
                    collection: collectionId
                  }
                }
              })
            })

            const dataContextMap:FirebaseDataContextRefMap = {}
            const userDataContextsRef = firebase.database().ref(userDataContextsKey)

            dataContexts.forEach((dataContext) => {
              const userDataContextRef = userDataContextsRef.push()
              userDataContextRef.set(JSON.stringify(dataContext))
              dataContextMap[userDataContextRef.key] = dataContext.title || dataContext.name
            })

            callback(error, dataContextMap)
          })
        })
      })
    })
  }

  callCODAP(request:any, callback?: (results:any) => void) {
    if (this.codapPhone) {
      this.codapPhone.call(request, callback)
    }
  }

  codapPhoneHandler(command:CODAPCommand, callback:Function) {
    var success = false;
    if (command) {
      switch (command.message) {
        case "codap-present":
          success = true;
          break
        case "cfm::autosaved":
          // pass autosave message back up to iframe
          window.parent.postMessage({type: "cfm::autosaved"}, "*")
          break
      }
    }
    callback({success: success});
  }

  iframeLoaded() {
    this.codapPhone = new iframePhone.IframePhoneRpcEndpoint(this.codapPhoneHandler, "data-interactive", this.refs.iframe)
  }

  /*
  handleMerge() {
    const dataContextName = this.state.dataContext.name

    this.setState({mergeState: "Merging..."})

    const showThenClear = (mergeState:MergeState) => {
      this.setState({mergeState: mergeState})
      setTimeout(() => {
        this.setState({mergeState: null})
      }, 2000)
    }

    const mergedDataContextInfo = () => {
      const {dataContext} = this.state
      return {
        name: `Merged${dataContext.name}`,
        title: `Merged: ${dataContext.title}`
      }
    }

    const merge = (callback: (caseId:number) => void) => {
      checkIfAlreadyMerged((existingCaseId:number) => {
        if (existingCaseId) {
          showThenClear("Already merged!")
          callback(existingCaseId)
        }
        else {
          createNewMergeCase((newCaseId) => {
            addCases(this.tree, newCaseId, () => {
              showThenClear("Merged")
              callback(newCaseId)
            })
          })
        }
      })
    }

    const checkIfAlreadyMerged = (callback: (caseId:number) => void) => {
      const mergedDataContext = mergedDataContextInfo()
      this.callCODAP({
        action: 'get',
        resource: `dataContext[${mergedDataContext.name}].collection[${mergedUserCollectionName}].caseSearch[${mergedEmailAndVersionAttributeName}==${this.props.email}:${this.props.version}]`
      }, (result:any) => {  // TODO
        callback(result.success && (result.values.length > 0) ? result.values[0].id : 0)
      })
    }

    const createNewMergeCase = (callback: (caseId:number) => void) => {
      const mergedDataContext = mergedDataContextInfo()
      const values:any = {} // TODO
      const them = this.props.classInfo.getUserName(this.props.email)
      values[mergedUserAttributeName] = `${them.found ? them.name.fullname : this.props.email} #${this.props.version}`
      values[mergedEmailAndVersionAttributeName] = `${this.props.email}:${this.props.version}`

      this.callCODAP({
        action: 'create',
        resource: `dataContext[${mergedDataContext.name}].collection[${mergedUserCollectionName}].case`,
        values: [{
          parent: null,
          values: values
        }]
      }, (result:any) => { // TODO
        callback(result.values[0].id)
      })
    }

    const addCases = (branch:any, parentId:number, callback:Function) => {  // TODO
      const mergedDataContext = mergedDataContextInfo()
      const atRoot = branch === this.tree
      const cases = Object.keys(branch).map((id) => branch[id])

      const checkIfDone = () => {
        if (atRoot) {
          callback()
        }
      }

      const addEachCase = () => {
        if (cases.length === 0) {
          checkIfDone()
        }
        else {
          const _case = cases.shift()
          this.callCODAP({
            action: 'create',
            resource: `dataContext[${mergedDataContext.name}].collection[${_case.collection}].case`,
            values: {
              parent: parentId,
              values: _case.values
            }
          }, (result:any) => { // TODO
            addCases(_case.children, result.values[0].id, callback)
            addEachCase()
          })
        }
      }

      const addAllCases = () => {
        const values = cases.map((_case) => { return { parent: parentId, values: _case.values }})
        this.callCODAP({
          action: 'create',
          resource: `dataContext[${mergedDataContext.name}].collection[${cases[0].collection}].case`,
          values: values
        }, (result:any) => { // TODO
          checkIfDone()
        })
      }

      const processCases = () => {
        if (cases.length === 0) {
          checkIfDone()
        }
        else {
          if (Object.keys(cases[0].children).length > 0) {
            // case has children so we need to add each case one and a time to get the id
            addEachCase()
          }
          else {
            // no children so we can bulk add all the cases
            addAllCases()
          }
        }
      }

      processCases()
    }

    const ensureMergedDataContextExists = (callback:() => void) => {
      const mergedDataContext = mergedDataContextInfo()
      this.callCODAP({
        action: 'get',
        resource: `dataContext[${mergedDataContext.name}]`
      }, (result:any) => {  // TODO
        const collections:any[] = [] // TODO

        // add all the collections
        const {dataContext} = this.state
        Object.keys(dataContext.collections).forEach((id) => {
          const collection = dataContext.collections[id]
          collections.push({
            name: collection.name,
            title: collection.title,
            parent: collection.parent ? collection.parent : mergedUserCollectionName,
            attrs: collection.attrs
          })
        })

        if (!result.success) {
          // if merged data context does not exist create the merged collection
          collections.unshift({
            name: mergedUserCollectionName,
            title: mergedUserCollectionTitle,
            attrs: [
              {name: mergedUserAttributeName, title: mergedUserAttributeTitle},
              {name: mergedEmailAndVersionAttributeName, title: mergedEmailAndVersionAttributeTitle, hidden: true}
            ]
          })

          this.callCODAP({
            action: 'create',
            resource: 'dataContext',
            values: {
              name: mergedDataContext.name,
              title: mergedDataContext.title,
              collections: collections
            }
          }, (result:any) => {  // TODO
            callback()
          })
        }
        else {
          // otherwise ensure that all the collections exist on each merge
          // (this is in case the DI does not add the collections until after startup like the Dataflow DI)
          this.callCODAP({
            action: 'create',
            resource: 'collection',
            values: collections
          }, (result:any) => {  // TODO
            callback()
          })
        }
      });
    }

    const showCaseTable = (callback: () => void) => {
      const mergedDataContext = mergedDataContextInfo()
      this.callCODAP({
        action: 'get',
        resource: `component[${mergedDataContext.name}]`
      }, (result:any) => {  // TODO
        if (!result.success) {
          this.callCODAP({
            action: 'create',
            resource: 'component',
            values: {
              type: 'caseTable',
              name: mergedDataContext.name,
              title: mergedDataContext.title,
              dataContext: mergedDataContext.name
            }
          }, (result:any) => {  // TODO
            callback()
          });
        }
        else {
          callback()
        }
      });
    }

    const selectMergedCase = (caseId:number) => {
      const mergedDataContext = mergedDataContextInfo()
      this.callCODAP({
        action: 'create',
        resource: `dataContext[${mergedDataContext.name}].selectionList`,
        values: [caseId]
      })
    }

    ensureMergedDataContextExists(() => {
      merge((caseId) => {
        showCaseTable(() => {
          selectMergedCase(caseId)
        })
      })
    })
  }
  */

  render() {
    return <iframe ref="iframe" src={this.state.codapUrl} onLoad={this.iframeLoaded}></iframe>
  }
}