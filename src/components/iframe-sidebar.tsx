import * as React from "react";
import {InitInteractiveData, AuthoredState} from "./iframe"
import {ExportLibrary} from "./export-library"
import {FirebaseInteractive, FirebaseUserInteractive, FirebaseDataContextRefMap, FirebaseData, FirebaseDataContext} from "./types"
import {ClassInfo, GetUserName} from "./class-info"
import escapeFirebaseKey from "./escape-firebase-key"

const queryString = require("query-string")
const base64url = require("base64-url")
const superagent = require("superagent")

declare var firebase: any;  // @types/firebase is not Firebase 3

const mergedUserCollectionName = "Merged"
const mergedUserCollectionTitle = "Merged"
const mergedUserAttributeName = "User"
const mergedUserAttributeTitle = "User"
const mergedEmailAttributeName = "Email"
const mergedEmailAttributeTitle = "Email"

export interface IFrameSidebarProps {
  initInteractiveData: InitInteractiveData
  authoredState: AuthoredState|null
  copyUrl: string|null
  codapPhone: any|null
}

export interface IFrameSidebarState {
  error: string|null
  classHash: string|null
  publishing: boolean
  publishingError: string|null
  publishingStatus: string|null
  userInteractives: PublishedUserInteractives[]
  myEmail: string
}

interface CopyResults {
  status: string
  valid: boolean
  id: number
  readAccessKey: string
  readWriteAccessKey: string
}

export interface PublishedUserInteractives {
  email: string
  name: string|null
  type: "teacher" | "student"
  userInteractives: FirebaseUserInteractive[]
}

export interface UserInteractivesProps {
  userInteractives: PublishedUserInteractives
  classHash: string
  interactiveId: number
  email: string
  codapPhone: any
  initInteractiveData: any
  myEmail: string
  classInfo: ClassInfo
}

export interface UserInteractivesState {
  showAll: boolean
}

export class UserInteractives extends React.Component<UserInteractivesProps, UserInteractivesState> {
  constructor(props: UserInteractivesProps) {
    super(props)
    this.state = {
      showAll: false
    }
    this.toggleShowAll = this.toggleShowAll.bind(this)
  }

  toggleShowAll() {
    this.setState({showAll: !this.state.showAll})
  }

  getVersion(index:number) {
    return this.props.userInteractives.userInteractives.length - index
  }

  renderAll() {
    if (!this.state.showAll) {
      return null
    }
    const {userInteractives} = this.props
    return this.props.userInteractives.userInteractives.slice(1).map((userInteractive, index) => {
      return (
        <UserInteractive
          key={userInteractive.createdAt}
          userInteractive={userInteractive}
          version={this.getVersion(index + 1)}
          classHash={this.props.classHash}
          interactiveId={this.props.interactiveId}
          initInteractiveData={this.props.initInteractiveData}
          email={this.props.userInteractives.email}
          codapPhone={this.props.codapPhone}
          first={false}
          myEmail={this.props.myEmail}
          classInfo={this.props.classInfo}
         />
      )
    })
  }

  render() {
    const {userInteractives} = this.props
    const hasMoreThanOne = userInteractives.userInteractives.length > 1
    return (
      <div className="user-interactives">
        <div className="user-interactives-name" onClick={this.toggleShowAll}>
          {userInteractives.name}
        </div>
        <UserInteractive
          userInteractive={userInteractives.userInteractives[0]}
          version={this.getVersion(0)}
          classHash={this.props.classHash}
          interactiveId={this.props.interactiveId}
          email={this.props.email}
          codapPhone={this.props.codapPhone}
          first={true}
          initInteractiveData={this.props.initInteractiveData}
          myEmail={this.props.myEmail}
          classInfo={this.props.classInfo}
        />
        {this.renderAll()}
      </div>
    )
  }
}

export interface UserInteractiveProps {
  userInteractive: FirebaseUserInteractive
  version: number
  classHash: string
  interactiveId: number
  email: string
  codapPhone: any
  first: boolean
  initInteractiveData: any
  myEmail: string
  classInfo: ClassInfo
}

export interface UserInteractiveState {
}

export class UserInteractive extends React.Component<UserInteractiveProps, UserInteractiveState> {
  constructor(props: UserInteractiveProps) {
    super(props)
    this.state = {
    }
  }

  renderCreatedAt() {
    const now = (new Date()).getTime()
    const diff = Math.max(now - this.props.userInteractive.createdAt, 0) / 1000
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
    return <div className="user-interactive-created-at">{when}</div>
  }

  render() {
    const {userInteractive} = this.props
    return (
      <div className={`user-interactive ${!this.props.first ? 'user-interactive-with-border' : ''}`}>
        <UserInteractiveDocument
          userInteractive={userInteractive}
          version={this.props.version}
          classHash={this.props.classHash}
          interactiveId={this.props.interactiveId}
          initInteractiveData={this.props.initInteractiveData}
          email={this.props.email}
        />
        {Object.keys(userInteractive.dataContexts).map((firebaseId) => {
          return (
            <UserInteractiveDataContext
              key={firebaseId}
              dataContextId={firebaseId}
              dataContextName={userInteractive.dataContexts[firebaseId]}
              version={this.props.version}
              classHash={this.props.classHash}
              interactiveId={this.props.interactiveId}
              email={this.props.email}
              codapPhone={this.props.codapPhone}
              myEmail={this.props.myEmail}
              classInfo={this.props.classInfo}
            />
          )
        })}
        {this.renderCreatedAt()}
      </div>
    )
  }
}

export interface UserInteractiveDocumentProps {
  userInteractive: FirebaseUserInteractive
  version: number
  classHash: string
  interactiveId: number
  initInteractiveData: any
  email: string
}

export interface UserInteractiveDocumentState {
  showOptions: boolean
}

export class UserInteractiveDocument extends React.Component<UserInteractiveDocumentProps, UserInteractiveDocumentState> {
  constructor(props: UserInteractiveDocumentProps) {
    super(props)
    this.state = {
      showOptions: false
    }
    this.toggleShowOptions = this.toggleShowOptions.bind(this)
    this.handleReplace = this.handleReplace.bind(this)
  }

  toggleShowOptions() {
    this.setState({showOptions: !this.state.showOptions})
  }

  handleReplace() {

  }

  renderOptions() {
    if (!this.state.showOptions) {
      return null
    }
    const classUrl = base64url.encode(this.props.initInteractiveData.classInfoUrl)
    const href = `../dashboard/?class=${classUrl}&interactive=${this.props.interactiveId}&user=${this.props.email}&createdAt=${this.props.userInteractive.createdAt}`

    return (
      <div className="user-interactive-document-options">
        <a className="user-interactive-view-document user-interactive-option" href={href} target="_blank">View In Dashboard</a>
        <div className="user-interactive-replace-document user-interactive-option">TDB: Replace My Document</div>
      </div>
    )
  }

  render() {
    return (
      <div>
        <div className="user-interactive-document" onClick={this.toggleShowOptions}>Document #{this.props.version}</div>
        {this.renderOptions()}
      </div>
    )
  }
}

export interface UserInteractiveDataContextProps {
  dataContextId: string
  dataContextName: string
  version: number
  classHash: string
  interactiveId: number
  email: string
  codapPhone: any
  myEmail: string
  classInfo: ClassInfo
}

export interface UserInteractiveDataContextState {
  showOptions: boolean
  copyState: "Copying..." | "Copied" | "Could not copy!" | null
  mergeState: "Merging..." | "Merged" | "Could not merge!" | null
  dataContext: any
}

export class UserInteractiveDataContext extends React.Component<UserInteractiveDataContextProps, UserInteractiveDataContextState> {
  private loading = false
  private tree:any = null

  constructor(props: UserInteractiveDataContextProps) {
    super(props)
    this.state = {
      showOptions: false,
      copyState: null,
      mergeState: null,
      dataContext: null
    }
    this.toggleShowOptions = this.toggleShowOptions.bind(this)
    this.handleCopy = this.handleCopy.bind(this)
    this.handleMerge = this.handleMerge.bind(this)
  }

  loadDataContext() {
    if (!this.loading && (this.state.dataContext === null)) {
      this.loading = true
      const dataContextRef = firebase.database().ref(`dataContexts/${this.props.classHash}/${this.props.email}/interactive_${this.props.interactiveId}/${this.props.dataContextId}`)
      dataContextRef.once("value", (snapshot:any) => {
        try {
          // convert to a tree
          const tree:any = {}
          const leaves:any = {}
          const dataContext:any = JSON.parse(snapshot.val())
          Object.keys(dataContext.cases).forEach((id) => {
            const _case:any = dataContext.cases[id]
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

          this.tree = tree
          this.setState({dataContext: dataContext})
        }
        catch (e) {

        }
      })
    }
  }

  toggleShowOptions() {
    this.loadDataContext()
    this.setState({showOptions: !this.state.showOptions})
  }

  handleMerge() {
    const dataContextName = this.state.dataContext.name

    this.setState({mergeState: "Merging..."})

    const merge = () => {
      addOrClearMergedUser((parentId, childrenToRemove) => {
        addCases(this.tree, parentId, () => {
          removeCases(childrenToRemove, () => {
            this.setState({mergeState: "Merged"})
            setTimeout(() => {
              this.setState({mergeState: null})
            }, 2000)
          })
        })
      })
    }

    const removeCases = (cases:any[], callback:Function) => {
      if (cases.length > 0) {
        const actions = cases.map((_case:any) => {
          return {
            action: 'delete',
            resource: `dataContext[${dataContextName}].collection[${_case.collection.name}].caseByID[${_case.id}]`
          }
        })
        this.props.codapPhone.call(actions, (result:any) => {
          callback()
        });
      }
      else {
        callback()
      }
    }

    const addOrClearMergedUser = (callback:(parentId:number, childrenToRemove:any[]) => void) => {
      const createNewMergedUser = (childrenToRemove:number[]) => {
        const values:any = {}
        const them = this.props.classInfo.getUserName(this.props.email)
        values[mergedUserAttributeName] = them.found ? them.name : this.props.email
        values[mergedEmailAttributeName] = this.props.email

        this.props.codapPhone.call({
          action: 'create',
          resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}].case`,
          values: [{
            parent: null,
            values: values
          }]
        }, (result:any) => {
          callback(result.values[0].id, childrenToRemove)
        })
      }

      this.props.codapPhone.call({
        action: 'get',
        resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}].caseSearch[${mergedEmailAttributeName}==${this.props.email}]`
      }, (result:any) => {
        if (result.success && (result.values.length > 0)) {
          var parentId = result.values[0].id
          this.props.codapPhone.call({
            action: 'get',
            resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}].caseByID[${parentId}]`
          }, (result:any) => {
            const actions = result.values.case.children.map((childId:number) => {
              return {
                action: 'get',
                resource: `dataContext[${dataContextName}].caseByID[${childId}]`
              }
            })
            this.props.codapPhone.call(actions, (result:any) => {
              const casesToDelete = result.map((result:any) => result.values.case)
              callback(parentId, result.map((result:any) => result.values.case))
            })
          })
        }
        else {
          createNewMergedUser([])
        }
      })
    }

    const addCases = (branch:any, parentId:number, callback:Function) => {
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
          this.props.codapPhone.call({
            action: 'create',
            resource: `dataContext[${dataContextName}].collection[${_case.collection}].case`,
            values: {
              parent: parentId,
              values: _case.values
            }
          }, (result:any) => {
            addCases(_case.children, result.values[0].id, callback)
            addEachCase()
          })
        }
      }

      const addAllCases = () => {
        const values = cases.map((_case) => { return { parent: parentId, values: _case.values }})
        this.props.codapPhone.call({
          action: 'create',
          resource: `dataContext[${dataContextName}].collection[${cases[0].collection}].case`,
          values: values
        }, (result:any) => {
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

    const addUserAttribute = (callback:() => void) => {
      const { collections } = this.state.dataContext
      const collectionNames:string[] = Object.keys(collections).map((id) => collections[id].name)

      //FIXME: only add the attribute to the "leaf" collection

      const addUserAttributeToCollection = () => {
        if (collectionNames.length === 0) {
          callback()
        }
        else {
          const collectionName = collectionNames.shift()
          // create the merge attribute
          this.props.codapPhone.call({
            action: 'create',
            resource: `dataContext[${dataContextName}].collection[${collectionName}].attribute`,
            values: {
              name: mergedUserAttributeName,
              title: mergedUserAttributeTitle
            }
          }, (result:any) => {
            addUserAttributeToCollection()
          });
        }
      }

      addUserAttributeToCollection()
    }

    const checkIfMergedCollectionExists = (callback:(result:boolean) => void) => {
      this.props.codapPhone.call({
        action: 'get',
        resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}]`
      }, (result:any) => {
        callback(result.success);
      });
    }

    const createMergedCollection = (callback:() => void) => {
      this.props.codapPhone.call({
        action: 'create',
        resource: `dataContext[${dataContextName}].collection`,
        values: {
          name: mergedUserCollectionName,
          title: mergedUserCollectionTitle,
          parent: "_root_"
        }
      }, (result:any) => {
        callback()
      })
    }

    const moveUserAttribute = (callback:() => void) => {
      this.props.codapPhone.call({
        action: 'update',
        resource: `dataContext[${dataContextName}].attributeLocation[${mergedUserAttributeName}]`,
        values: {
          collection: mergedUserCollectionName
        }
      }, (result:any) => {
        callback()
      })
    }

    const createEmailAttribute = (callback:() => void) => {
      this.props.codapPhone.call({
        action: 'create',
        resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}].attribute`,
        values: {
          name: mergedEmailAttributeName,
          title: mergedEmailAttributeTitle,
          hidden: true
        }
      }, (result:any) => {
        callback()
      });
    }

    const setUserAndEmailAttribute = (callback:() => void) => {
      this.props.codapPhone.call({
        action: "get",
        resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}].allCases`
      }, (result:any) => {
        const values:any = {}
        const me = this.props.classInfo.getUserName(this.props.myEmail)
        values[mergedUserAttributeName] = me.found ? me.name : this.props.myEmail
        values[mergedEmailAttributeName] = this.props.myEmail
        const requests = result.values.cases.map((_case:any) => {
          return {
            action: 'update',
            resource: `dataContext[${dataContextName}].collection[${mergedUserCollectionName}].caseByID[${_case.case.id}]`,
            values: {
              values: values
            }
          }
        })
        this.props.codapPhone.call(requests, (result:any) => {
          callback()
        })
      })
    }

    checkIfMergedCollectionExists((exists) => {
      if (exists) {
        merge()
      }
      else {
        addUserAttribute(() => {
          createMergedCollection(() => {
            moveUserAttribute(() => {
              createEmailAttribute(() => {
                setUserAndEmailAttribute(() => {
                  merge()
                })
              })
            })
          })
        })
      }
    });
  }

  handleCopy() {
    this.setState({copyState: "Copying..."})

    const addItemValues = (item:any, row:any) => {
      Object.keys(item.values).forEach((key) => {
        row[key] = item.values[key]
      })
    }

    const addParentValues = (item:any, row:any) => {
      if (item.parent) {
        addParentValues(item.parent, row)
        addItemValues(item.parent, row)
      }
    }

    const addToRows = (item:any, rows:any[]) => {
      if (Object.keys(item.children).length !== 0) {
        Object.keys(item.children).forEach((id) => {
          addToRows(item.children[id], rows)
        })
      }
      else {
        const row:any = {}
        addParentValues(item, row)
        addItemValues(item, row)
        rows.push(row)
      }
    }

    // create tables for each top level collection
    const tables:string[] = []
    Object.keys(this.tree).forEach((id) => {
      const rows:any[] = []
      addToRows(this.tree[id], rows)

      if (rows.length > 0) {
        const tableHeader = Object.keys(rows[0]).map((col:any) => {
          return `<th>${col}</th>`
        }).join("")
        const tableRows = rows.map((row:any) => {
          const tds = Object.keys(row).map((col:any) => {
            return `<td>${row[col]}</td>`
          }).join("")
          return `<tr>${tds}</tr>`
        }).join("")
        tables.push(`<table width='100%'><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table>`)
      }

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
          (window as any).clipboardData.setData("text", content)
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

        this.setState({copyState: copied ? "Copied" : "Could not copy!"})
        setTimeout(() => {
          this.setState({copyState: null})
        }, 2000)
      }
    })
  }

  renderOptions() {
    if (!this.state.showOptions) {
      return null
    }
    if (!this.state.dataContext) {
      return (
        <div className="user-interactive-datacontext-options">
          Loading data...
        </div>
      )
    }
    return (
      <div className="user-interactive-datacontext-options">
        <div className="user-interactive-merge-datacontext user-interactive-option" onClick={this.handleMerge}>Merge Into My Document</div>
        {this.state.mergeState ? <div className="user-interactive-action-state">{this.state.mergeState}</div> : null}
        <div className="user-interactive-copy-datacontext user-interactive-option" onClick={this.handleCopy}>Copy To Clipboard</div>
        {this.state.copyState ? <div className="user-interactive-action-state">{this.state.copyState}</div> : null}
      </div>
    )
  }

  render() {
    return (
      <div>
        <div className="user-interactive-datacontext" onClick={this.toggleShowOptions}>{this.props.dataContextName} #{this.props.version}</div>
        {this.renderOptions()}
      </div>
    )
  }
}

export class IFrameSidebar extends React.Component<IFrameSidebarProps, IFrameSidebarState> {
  private interactiveRef:any
  private userInteractivesRef:any
  private classInfo:ClassInfo
  private classroomRef:any

  constructor(props: IFrameSidebarProps) {
    super(props)

    this.onPublish = this.onPublish.bind(this)
    this.state = {
      error: null,
      classHash: null,
      publishing: false,
      publishingError: null,
      publishingStatus: null,
      userInteractives: [],
      myEmail: this.props.initInteractiveData.authInfo.email
    }

    this.classInfo = new ClassInfo(this.props.initInteractiveData.classInfoUrl || "")
  }

  componentWillMount() {
    this.classInfo.getClassInfo((err, info) => {
      if (err) {
        this.setState({error: err})
        return
      }

      this.setState({
        classHash: info.classHash
      })

      const refName = `classes/${info.classHash}`
      this.classroomRef = firebase.database().ref(refName)
      this.classroomRef.on("value", (snapshot:any) => {
        const firebaseData:FirebaseData = snapshot.val()
        const publishedUserInteractives:PublishedUserInteractives[] = []
        const interactiveKey = `interactive_${this.props.initInteractiveData.interactive.id}`

        const sortUserInteractives = (a: FirebaseUserInteractive, b: FirebaseUserInteractive):number => {
          return b.createdAt - a.createdAt
        }

        if (firebaseData) {

          let usernameNotFound = false

          Object.keys(firebaseData.users || {}).forEach((email) => {
            const interactive = (firebaseData.users[email].interactives || {})[interactiveKey]
            if (interactive) {
              const userInteractives:FirebaseUserInteractive[] = []
              const user = this.classInfo.getUserName(email)
              usernameNotFound = usernameNotFound || !user.found
              Object.keys(interactive).forEach((publishKey) => {
                userInteractives.push(interactive[publishKey])
              })
              if (userInteractives.length > 0) {
                publishedUserInteractives.push({
                  email: email,
                  name: user.name,
                  type: "student",
                  userInteractives: userInteractives.sort(sortUserInteractives)
                })
              }
            }
          })

          if (usernameNotFound) {
            this.classInfo.getStudentNames((err, names) => {
              if (!err) {
                const userInteractives = this.state.userInteractives.slice()
                userInteractives.forEach((userInteractive) => {
                  userInteractive.name = this.classInfo.getUserName(userInteractive.email).name
                })
              }
            })
          }
        }

        this.setState({userInteractives: publishedUserInteractives})
      })
    })
  }

  saveDataContexts(userDataContextsKey: string, callback: (err:string|null, dataContextMap?: FirebaseDataContextRefMap) => void) {
    this.props.codapPhone.call({
      action: 'get',
      resource: 'dataContextList'
    }, (result:any) => {
      result = result || {success: false, values: {error: "Unable to get list of data contexts!"}}
      if (!result.success) {
        return callback(result.values.error)
      }

      const dataContexts:any[] = []
      const uniqueDataContextNames:string[] = []
      const collectionRequests:any[] = []
      result.values.forEach((value:any) => {
        // ignore duplicate context names (generated from ill behaving DIs)
        if (uniqueDataContextNames.indexOf(value.name) !== -1) {
          return
        }
        uniqueDataContextNames.push(value.name)

        dataContexts.push({
          name: value.name,
          title: value.title,
          collections: {},
          cases: {},
          mergedCollection: 0
        })
        collectionRequests.push({
          action: "get",
          resource: `dataContext[${value.name}].collectionList`
        })
      })

      this.props.codapPhone.call(collectionRequests, (results:any) => {
        results = results || [{success: false, values: {error: "Unable to get list of collections!"}}]
        let error:string|null = null

        const dataContextForRequest:any[] = []
        const caseRequests:any[] = []
        results.forEach((result:any, dataContextIndex:number) => {
          if (error || !result.success) {
            error = error || result.values.error
            return
          }
          const dataContext = dataContexts[dataContextIndex]
          result.values.forEach((value:any, requestIndex:number) => {
            dataContext.collections[value.id] = {
              name: value.name,
              title: value.title
            }
            if (value.name === mergedUserCollectionName) {
              dataContext.mergedCollection = value.id
            }
            dataContextForRequest.push(dataContext)
            caseRequests.push({
              action: "get",
              resource: `dataContext[${dataContext.name}].collection[${value.name}].allCases`
            })
          })
        })

        if (error) {
          return callback(error)
        }

        this.props.codapPhone.call(caseRequests, (results:any) => {
          results = results || [{success: false, values: {error: "Unable to get case data!"}}]
          let error:string|null = null

          results.forEach((result:any, requestIndex:number) => {
            if (error || !result.success) {
              error = error || result.values.error
              return
            }

            const dataContext = dataContextForRequest[requestIndex]
            const collectionId = result.values.collection.id
            result.values.cases.forEach((_case:any) => {
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
            if (dataContext.mergedCollection) {
              // remove merged collection and all data not associated with the current user
              const checkIfCurrentUserCase = (_case:any):any => {
                if (_case.collection === dataContext.mergedCollection) {
                  return {
                    isCurrentUserCase: _case.values[mergedEmailAttributeName] === this.state.myEmail,
                    collection: _case.collection
                  }
                }
                if (!_case.parent) {
                  return {
                    isCurrentUserCase: true,
                    collection: 0
                  }
                }
                return checkIfCurrentUserCase(dataContext.cases[_case.parent])
              }

              const userCases:any = {}
              Object.keys(dataContext.cases).forEach((caseId) => {
                const _case = dataContext.cases[caseId]
                if (_case.collection !== dataContext.mergedCollection) {
                  const check = checkIfCurrentUserCase(_case)
                  if (check.isCurrentUserCase) {
                    if (check.collection === dataContext.mergedCollection) {
                      _case.parent = null
                    }
                    userCases[caseId] = _case
                  }
                }
              })
              dataContext.cases = userCases
              delete dataContext.collections[dataContext.mergedCollection]
            }

            const userDataContextRef = userDataContextsRef.push()
            userDataContextRef.set(JSON.stringify(dataContext))
            dataContextMap[userDataContextRef.key] = dataContext.title || dataContext.name
          })

          callback(error, dataContextMap)
        })
      })
    })
  }

  onPublish(e:React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()

    if (!this.props.initInteractiveData) {
      return
    }

    this.setState({
      publishing: true,
      publishingStatus: "Publishing..."
    })

    const data = this.props.initInteractiveData
    const classroomKey = `classes/${this.state.classHash}`
    const safeUserKey = escapeFirebaseKey(data.authInfo.email)
    const interactiveKey = `${classroomKey}/interactives/interactive_${data.interactive.id}`
    const userInteractivesKey = `${classroomKey}/users/${safeUserKey}/interactives/interactive_${data.interactive.id}`
    const userDataContextsKey = `dataContexts/${this.state.classHash}/${safeUserKey}/interactive_${data.interactive.id}`

    superagent
      .post(this.props.copyUrl)
      .set('Accept', 'application/json')
      .end((err:any, res:any) => {
        this.setState({
          publishingError: null,
          publishing: false
        })

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
              const documentUrl = `${this.props.authoredState.codapUrl}?#file=lara:${base64url.encode(JSON.stringify(laraParams))}`

              this.saveDataContexts(userDataContextsKey, (err, dataContexts) => {
                if (err) {
                  throw err
                }

                // save the interactive name (noop after it is first set)
                const firebaseInteractive:FirebaseInteractive = {name: data.interactive.name}
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

        if (err) {
          this.setState({publishingError: err})
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

  renderUserInteractives() {
    if ((this.state.classHash === null) || (this.state.userInteractives.length === 0)) {
      return null
    }

    return (
      <div className="user-interactive-list">
        { this.state.userInteractives.map((userInteractives) => {
          return (
            <UserInteractives
              key={userInteractives.email}
              userInteractives={userInteractives}
              classHash={this.state.classHash || ""}
              interactiveId={this.props.initInteractiveData.interactive.id}
              email={userInteractives.email}
              codapPhone={this.props.codapPhone}
              initInteractiveData={this.props.initInteractiveData}
              myEmail={this.state.myEmail}
              classInfo={this.classInfo}
            />
          )
        })
        }
      </div>
    )
  }

  renderUsernameHeader() {
    var me = this.classInfo.getUserName(this.state.myEmail)
    var username = me.found ? me.name : null;
    if (!username) {
      return null;
    }
    return <div className="username-header">{username}</div>
  }

  render() {
    if (this.state.error) {
      return <div id="iframe-sidebar">{this.state.error}</div>
    }

    if (!this.state.classHash || !this.props.codapPhone) {
      return null;
    }

    // const href = `../dashboard/?class=${base64url.encode(this.props.initInteractiveData.classInfoUrl)}`
    //            <a className="button button-primary" href={href} target="_blank">View</a>
    return <div id="iframe-sidebar">
             { this.renderUsernameHeader() }
             <div className="buttons">
               <button className="button button-primary" onClick={this.onPublish} disabled={this.state.publishing}>Publish</button>
             </div>
             { this.renderPublishingError() }
             { this.renderPublishingStatus() }
             { this.renderUserInteractives() }
           </div>
  }
}