import * as React from "react";
import {SharingClient, SharableApp, Representation, Text, Context, CODAP, CODAPDataContext} from "cc-sharing"
const queryString = require("query-string")
import {Firebase, IFramePhone, FirebaseInteractive, FirebaseUserInteractive, FirebaseDataContextRefMap, FirebaseDataContextPathMap, FirebaseData, FirebaseDataContext, UserName, Window} from "./types"
import {SuperagentError, SuperagentResponse} from "./types"
import {ClassInfo, GetUserName} from "./class-info"
import escapeFirebaseKey from "./escape-firebase-key"
import getAuthDomain from "./get-auth-domain"
import {InitInteractiveData, AuthoredState, CODAPAuthoredState, CollabSpaceAuthoredState, HandlePublishFunction} from "./iframe"
import * as refs from "./refs"

const superagent = require("superagent")
const base64url = require("base64-url")

declare var iframePhone: IFramePhone
declare var firebase: Firebase

export const mergedDataContextName = "Merged"
export const mergedDataContextTitle = "Merged"
export const mergedUserCollectionName = "Merged"
export const mergedUserCollectionTitle = "Merged"
export const mergedUserAttributeName = "User"
export const mergedUserAttributeTitle = "User"
export const mergedEmailAndVersionAttributeName = "EmailAndVersion"
export const mergedEmailAndVersionAttributeTitle = "EmailAndVersion"

type ResolvePublish = (value?: Representation[] | PromiseLike<Representation[]> | undefined) => void
type RejectPublish = (reason?: any) => void

export interface CopyResults {
  status: string
  valid: boolean
  id: number
  readAccessKey: string
  readWriteAccessKey: string
}

export interface DataContextLeafMap {
  [key: string]: DataContextLeaf
}

export interface DataContextCache {
  [key: string]: DataContextCacheItem
}

export interface DataContextCacheItem {
  tree: DataContextLeafMap
  dataContext: any // TODO
}

export interface DataContextLeaf {
  values: any
  collection: string
  children: DataContextLeafMap
  parent: DataContextLeaf|null
}

export type CodapShimMessage = SetCopyUrlMessage | MergeIntoDocumentMessage | CopyToClipboardMessage

export const SetCopyUrlMessageName = "setCopyUrl"
export interface SetCopyUrlMessage {
  copyUrl: string
}

export const MergeIntoDocumentMessageName = "mergeIntoDocument"
export interface MergeIntoDocumentMessage {
  representation: Representation
}

export const CopyToClipboardMessageName = "copyToClipboard"
export interface CopyToClipboardMessage {
  representation: Representation
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
  classInfoUrl: string|null
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
  authDomain: string
}

export class CodapShim extends React.Component<CodapShimProps, CodapShimState> {
  private codapPhone: CODAPPhone|null = null
  private sharinatorPrefix = /^Sharinator/
  private cfmPrefix = /^cfm::/
  private iframeCanAutosave = false
  private interactiveRef:any // TODO
  private userDataContextsRef:any // TODO
  private classInfo:ClassInfo
  private classroomRef:any // TODO
  private dataContextTreeCache:DataContextCache

  constructor(props: CodapShimProps) {
    super(props)

    this.dataContextTreeCache = {}

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
    phone.addListener(SetCopyUrlMessageName, (message:SetCopyUrlMessage) => {
      this.setState({copyUrl: message.copyUrl})
    })
    phone.addListener(MergeIntoDocumentMessageName, (message:MergeIntoDocumentMessage) => {
      this.mergeIntoDocument(message.representation)
    })
    phone.addListener(CopyToClipboardMessageName, (message:CopyToClipboardMessage) => {
      this.copyToClipboard(message.representation)
    })

    phone.initialize();
    const sharingClient = new SharingClient({phone, app})

    this.state = {
      codapUrl: query.codapUrl,
      email: query.email,
      interactiveId: query.interactiveId,
      interactiveName: query.interactiveName,
      classHash: null,
      copyUrl: null,
      authDomain: getAuthDomain(query.classInfoUrl)
    }

    this.classInfo = new ClassInfo(query.classInfoUrl || "")
    this.classInfo.getClassInfo((err, info) => {
      if (!err) {
        this.setState({classHash: info.classHash})
      }
    })
  }

  refs: {
    iframe: HTMLIFrameElement
  }

  handlePublish(resolve:ResolvePublish, reject:RejectPublish) {
    const {interactiveId, email, interactiveName} = this.state
    if (!interactiveId || (email === null) || (interactiveName === null) || !this.state.copyUrl || !this.state.classHash) {
      reject("Not ready to publish")
      return
    }


    this.interactiveRef = this.interactiveRef || refs.makeInteractiveRef(this.state.authDomain, this.state.classHash, interactiveId)
    this.userDataContextsRef = this.userDataContextsRef || refs.makeUserDataContextsRef(this.state.authDomain, this.state.classHash, interactiveId, email)

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

              this.saveDataContexts((err, dataContexts, dataContextPaths) => {
                if (err) {
                  throw err
                }

                // save the interactive name (noop after it is first set)
                const firebaseInteractive:FirebaseInteractive = {name: interactiveName}
                this.interactiveRef.set(firebaseInteractive)

                let representations:Representation[] = [{
                  type: CODAP,
                  dataUrl: documentUrl
                }]
                if (dataContextPaths) {
                  Object.keys(dataContextPaths).forEach((dataContextPath) => {
                    representations.push({
                      type: CODAPDataContext,
                      dataUrl: dataContextPath,
                      name: dataContextPaths[dataContextPath]
                    })
                  })
                }

                resolve(representations)
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

  saveDataContexts(callback: (err:string|null, dataContextRefMap?: FirebaseDataContextRefMap, dataContextPathMap?: FirebaseDataContextPathMap) => void) {
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
            const dataContextPathMap:FirebaseDataContextPathMap = {}

            dataContexts.forEach((dataContext) => {
              const userDataContextRef = this.userDataContextsRef.push()
              userDataContextRef.set(JSON.stringify(dataContext))
              dataContextPathMap[userDataContextRef.toString()] = dataContextMap[userDataContextRef.key] = dataContext.title || dataContext.name
            })

            callback(error, dataContextMap, dataContextPathMap)
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

  loadDataContext(representation:Representation, callback: (err:any, tree?:DataContextLeafMap, dataContext?:any) => void) {
    if (this.dataContextTreeCache[representation.dataUrl]) {
      callback(null, this.dataContextTreeCache[representation.dataUrl].tree, this.dataContextTreeCache[representation.dataUrl].dataContext)
      return
    }

    const dataContextRef = refs.makeRefFromUrl(representation.dataUrl)
    dataContextRef.once("value", (snapshot:any) => {
      let dataContext:any
      try {
        dataContext = JSON.parse(snapshot.val())  // TODO
      }
      catch (e) {
        callback(e)
        return
      }

      // convert to a tree
      const tree:DataContextLeafMap = {}
      const leaves:DataContextLeafMap = {}
      Object.keys(dataContext.cases).forEach((id) => {
        const _case:any = dataContext.cases[id]  // TODO
        const parent = _case.parent ? leaves[_case.parent] : null
        const leaf = {
          values: _case.values,
          collection: dataContext.collections[_case.collection].name,
          children: {},
          parent: parent
        }
        leaves[id] = leaf
        if (parent) {
          parent.children[id] = leaf
        }
        else {
          tree[id] = leaf
        }
      })

      this.dataContextTreeCache[representation.dataUrl] = {tree, dataContext}
      callback(null, tree, dataContext)
    })
  }

  mergeIntoDocument(representation:Representation) {
    this.loadDataContext(representation, (err, tree, dataContext) => {
      if (err || !tree) {
        if (err) {
          alert(err.toString())
        }
        return
      }

      const dataContextName = representation.name
      const email = this.state.email || ""
      const version = 0

      const mergedDataContextInfo = () => {
        return {
          name: `Merged${dataContextName}`,
          title: `Merged: ${dataContextName}`
        }
      }

      const merge = (callback: (caseId:number) => void) => {
        checkIfAlreadyMerged((existingCaseId:number) => {
          if (existingCaseId) {
            callback(existingCaseId)
          }
          else {
            createNewMergeCase((newCaseId) => {
              addCases(tree, newCaseId, () => {
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
          resource: `dataContext[${mergedDataContext.name}].collection[${mergedUserCollectionName}].caseSearch[${mergedEmailAndVersionAttributeName}==${email}:${version}]`
        }, (result:any) => {  // TODO
          callback(result.success && (result.values.length > 0) ? result.values[0].id : 0)
        })
      }

      const createNewMergeCase = (callback: (caseId:number) => void) => {
        const mergedDataContext = mergedDataContextInfo()
        const values:any = {} // TODO
        const them = this.classInfo.getUserName(email)
        values[mergedUserAttributeName] = `${them.found ? them.name.fullname : email} #${version}`
        values[mergedEmailAndVersionAttributeName] = `${email}:${version}`

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
        const atRoot = branch === tree
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
    })
  }

  copyToClipboard(representation:Representation) {
    this.loadDataContext(representation, (err, tree) => {
      if (err || !tree) {
        if (err) {
          alert(err.toString())
        }
        return
      }

      const addItemValues = (item:any, row:any) => { // TODO
        Object.keys(item.values).forEach((key) => {
          row[key] = item.values[key]
        })
      }

      const addParentValues = (item:any, row:any) => { // TODO
        if (item.parent) {
          addParentValues(item.parent, row)
          addItemValues(item.parent, row)
        }
      }

      const addToRows = (item:any, rows:any[]) => { // TODO
        if (Object.keys(item.children).length !== 0) {
          Object.keys(item.children).forEach((id) => {
            addToRows(item.children[id], rows)
          })
        }
        else {
          const row:any = {} // TODO
          addParentValues(item, row)
          addItemValues(item, row)
          rows.push(row)
        }
      }

      // split the tree into top level collections
      const collections:DataContextLeafMap = {}
      Object.keys(tree).forEach((id) => {
        const leaf = tree[id]
        if (!leaf.parent) {
          if (!collections[leaf.collection]) {
            collections[leaf.collection] = {
              values: [],
              collection: leaf.collection,
              children: {},
              parent: null
            }
          }
          collections[leaf.collection].children[id] = leaf
        }
      })

      // create tables for each top level collection
      const tables:string[] = []
      Object.keys(collections).forEach((id) => {
        const rows:any[] = [] // TODO
        addToRows(collections[id], rows)

        if (rows.length > 0) {
          const tableHeader = Object.keys(rows[0]).map((col:any) => { // TODO
            return `<th>${col}</th>`
          }).join("")
          const tableRows = rows.map((row:any) => { // TODO
            const tds = Object.keys(row).map((col:any) => { // TODO
              return `<td>${row[col]}</td>`
            }).join("")
            return `<tr>${tds}</tr>`
          }).join("")
          tables.push(`<table width='100%'><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table>`)
        }
      })

      // copy to clipboard
      const content = tables.join("")
      let copied = false
      let selection, range, mark
      try {
        mark = document.createElement("mark")
        mark.innerHTML = content
        document.body.appendChild(mark)

        selection = document.getSelection()
        selection.removeAllRanges()

        range = document.createRange()
        range.selectNode(mark)
        selection.addRange(range)

        copied = document.execCommand("copy")
      }
      catch (e) {
        try {
          (window as Window).clipboardData.setData("text", content)
          copied = true
        }
        catch (e) {
          copied = false
        }
      }
      finally {
        if (selection) {
          if (range && (typeof selection.removeRange === "function")) {
            selection.removeRange(range)
          }
          else {
            selection.removeAllRanges()
          }
        }
        if (mark) {
          document.body.removeChild(mark)
        }
      }
    })
  }

  render() {
    return <iframe ref="iframe" src={this.state.codapUrl} onLoad={this.iframeLoaded}></iframe>
  }
}