import * as React from "react";
import { Interactive, InteractiveMap, User, UserMap, UserInteractive, FirebaseInteractive, FirebaseUser, FirebaseData, FirebaseUserInteractive, Activity} from "./types"
import { UserPage } from "./user-page"
import { ClassroomPage } from "./classroom-page"
import { ClassInfo } from "./class-info"
import {SuperagentError, SuperagentResponse, Firebase, FirebaseSnapshot, FirebaseRef} from "./types"

const superagent = require("superagent")

declare var firebase: Firebase

const base64url = require("base64-url")
const queryString = require("query-string")

export interface AppProps {
}

export interface AppState {
  class: string|null
  className: string|null
  loading: boolean
  error: string|null
  userInteractive: UserInteractive|null
  user: User|null
  interactives: Array<Interactive>
  users: Array<User>,
  activity: Array<Activity>
  firebaseData: FirebaseData|null
}

export class App extends React.Component<AppProps, AppState> {
  private classroomRef:FirebaseRef
  private classInfo:ClassInfo

  constructor(props: AppProps) {
    super(props)

    this.setUserInteractive = this.setUserInteractive.bind(this)
    this.getInteractiveHref = this.getInteractiveHref.bind(this)

    this.state = {
      class: null,
      className: null,
      loading: true,
      error: null,
      userInteractive: null,
      user: null,
      interactives: [],
      users: [],
      activity: [],
      firebaseData: null
    }
  }

  componentWillMount() {
    const query = queryString.parse(location.search)

    if (!query.class && !(query.offering && query.token)) {
      return this.setState({error: "Missing class or offering and token in query string"})
    }

    this.setState({
      loading: true,
      class: query.class
    })

    if (query.offering) {
      this.loadOfferingInfo(query.offering, query.token)
    }
    else {
      this.loadClassInfo(query.class)
    }
  }

  loadOfferingInfo(offeringUrl:string, token:string) {
    const match = offeringUrl.match(/\/(offerings\/(\d+)\/for_class)$/)
    if (match) {
      const [_, apiPath, offeringId] = match
      superagent
        .get(offeringUrl)
        .set({'Authorization': `Bearer ${token}`})
        .end((err:SuperagentError, res:SuperagentResponse) => {
          if (res.ok) {
            if ((res.body.length > 0) && res.body[0].clazz_id) {
              const clazz = offeringUrl.replace(apiPath, `classes/${res.body[0].clazz_id}`)
              this.setState({class: clazz})
              this.loadClassInfo(clazz)
            }
            else {
              return this.setState({error: "No classes found for offering in query string"})
            }
          }
          else {
            this.setState({error: "Unable to load offering in query string"})
          }
        })
    }
    else {
      this.setState({error: "Invalid offering url in query string, must be /for_class"})
    }
  }

  loadClassInfo(classInfoUrl:string) {
    let firstLoad = true
    const query = queryString.parse(location.search)

    this.classInfo = new ClassInfo(classInfoUrl)
    this.classInfo.getClassInfo((err, info) => {
      if (err) {
        this.setState({
          loading: false,
          error: err
        })
        return
      }

      this.setState({className: info.name})

      // connect to firebase
      this.classroomRef = firebase.database().ref(`classes/${info.classHash}`)
      this.classroomRef.on("value", (snapshot:FirebaseSnapshot) => {
        const interactives:Array<Interactive> = []
        const users:Array<User> = []
        const activity:Array<Activity> = []
        const firebaseData:FirebaseData = snapshot.val()
        let user:User|null = null
        let userInteractive:UserInteractive|null = null
        let error:string|null = null
        let createdAt:number|null = null
        const interactiveMap:InteractiveMap = {}
        const userMap:UserMap = {}
        let userNamesNotFound:boolean = false

        if (firebaseData) {
          if (firebaseData.interactives) {
            Object.keys(firebaseData.interactives).forEach((firebaseInteractiveId) => {
              const firebaseInteractive:FirebaseInteractive = firebaseData.interactives[firebaseInteractiveId]
              const interactive:Interactive = {
                id: firebaseInteractiveId,
                name: firebaseInteractive.name,
                users: {}
              }
              interactives.push(interactive)
              interactiveMap[firebaseInteractiveId] = interactive
            })
          }

          if (firebaseData.users) {
            Object.keys(firebaseData.users).forEach((firebaseUserId) => {
              const firebaseUser:FirebaseUser = firebaseData.users[firebaseUserId]
              const userName = this.classInfo.getUserName(firebaseUserId)
              const user:User = {
                id: firebaseUserId,
                name: userName.name,
                interactives: {}
              }
              if (!userName.found) {
                userNamesNotFound = true
              }

              if (firebaseUser.interactives) {
                Object.keys(firebaseUser.interactives).forEach((firebaseInteractiveId) => {
                  const interactive = interactiveMap[firebaseInteractiveId]
                  if (interactive) {
                    const userInteractives = user.interactives[firebaseInteractiveId] = user.interactives[firebaseInteractiveId] || []
                    const firebaseUserInteractives = firebaseUser.interactives[firebaseInteractiveId]
                    Object.keys(firebaseUserInteractives).forEach((firebaseUserInteractiveId) => {
                      const firebaseUserInteractive = firebaseUserInteractives[firebaseUserInteractiveId]
                      const userInteractive:UserInteractive = {
                        id: firebaseInteractiveId,
                        name: interactive.name,
                        url: firebaseUserInteractive.documentUrl,
                        createdAt: firebaseUserInteractive.createdAt
                      }
                      userInteractives.push(userInteractive)

                      activity.push({
                        user: user,
                        userInteractive: userInteractive
                      })
                    })
                    userInteractives.sort((a, b) => {return b.createdAt - a.createdAt })
                  }
                })
              }
              users.push(user)
              userMap[firebaseUserId] = user
            })
          }

          users.sort((a, b) => {return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)})
          interactives.sort((a, b) => {return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)})
          activity.sort((a, b) => {return b.userInteractive.createdAt - a.userInteractive.createdAt})

          users.forEach((user) => {
            Object.keys(user.interactives).forEach((interactiveId) => {
              const interactive = interactiveMap[interactiveId]
              if (interactive) {
                interactive.users[user.id] = user
              }
            })
          })

          if (firstLoad) {
            window.addEventListener("popstate", (e) => {
              const state = e.state || {}
              const user = state.user || null
              const interactive = state.interactive || null

              this.setState({userInteractive: state.userInteractive || null, user: state.user || null})
            })

            if (query.interactive && query.user) {
              user = userMap[query.user]
              const interactiveKey = `interactive_${query.interactive}`
              const interactive = interactiveMap[interactiveKey]
              if (user && interactive) {
                let userInteractives = user.interactives[interactive.id]
                if (userInteractives) {
                  if (query.createdAt) {
                    createdAt = parseInt(query.createdAt, 10)
                    userInteractives = userInteractives.filter((userInteractive) => { return userInteractive.createdAt === createdAt })
                  }
                  userInteractive = userInteractives[0] || null
                }
              }

              if (!user || !userInteractive) {
                error = "Sorry, the requested user interactive was not found!"
              }
            }
            firstLoad = false
          }
        }
        else {
          error = "No interactives have been shared yet for this classroom"
        }

        this.setState({
          loading: false,
          error: error,
          interactives: interactives,
          users: users,
          activity: activity,
          user: user || this.state.user,
          userInteractive: userInteractive || this.state.userInteractive,
          firebaseData: firebaseData
        })

        if (userNamesNotFound) {
          this.classInfo.getStudentNames((err, names) => {
            if (err) {
              this.setState({error: err})
              return
            }
            this.setState({
              users: users.map((user) => {
                if (names[user.id] !== undefined) {
                  user.name = names[user.id]
                }
                return user
              })
            })
          })
        }
      })
    })


  }

  componentWillUnmount() {
    if (this.classroomRef) {
      this.classroomRef.off()
    }
  }

  onClassroomClick() {
    if (history.pushState && this.state.class) {
      history.pushState({}, "", `${location.pathname}?class=${this.state.class}`)
    }
    this.setState({userInteractive: null, user: null})
  }

  renderNav():JSX.Element|null {
    if (this.state.class !== null) {
      const showClassroomButton = (this.state.user !== null) && (this.state.userInteractive !== null)
      return <div className="nav">
               { this.state.className !== null ? <h3>{this.state.className}</h3> : null }
               {showClassroomButton ? <button key="classroom" className="button button-primary" onClick={this.onClassroomClick.bind(this)}>View All</button> : null}
             </div>
    }
    return null
  }

  getInteractiveHref(user:User, userInteractive:UserInteractive):string {
    return `${location.pathname}?class=${this.state.class}&interactive=${userInteractive.id.split("_")[1]}&user=${user.id}&createdAt=${userInteractive.createdAt}`
  }

  setUserInteractive(user:User, userInteractive:UserInteractive) {
    if (history.pushState) {
      const href = this.getInteractiveHref(user, userInteractive)
      history.pushState({user: user, userInteractive: userInteractive}, "", href)
    }

    this.setState({
      user: user,
      userInteractive: userInteractive
    })
  }

  renderPage():JSX.Element|null {
    if (this.state.class !== null) {
      if ((this.state.userInteractive !== null) && (this.state.user !== null)) {
        return <UserPage
                 userInteractive={this.state.userInteractive}
                 user={this.state.user}
                 setUserInteractive={this.setUserInteractive}
                 getInteractiveHref={this.getInteractiveHref}
                 classInfo={this.classInfo}
                 />
      }
      return <ClassroomPage
               class={this.state.class}
               interactives={this.state.interactives}
               users={this.state.users}
               activity={this.state.activity}
               setUserInteractive={this.setUserInteractive}
               getInteractiveHref={this.getInteractiveHref}
               classInfo={this.classInfo}
               />
    }
    return null
  }

  render() {
    return <div className="container">
      <div className="row">
        <div className="twelve columns">
          <div className="header">
            <img src="../assets/img/concord.png" /> Classroom Sharing
          </div>
          { this.renderNav() }
          { !this.state.error && this.state.loading ? <div className="section loading"><img src="../assets/img/loading.gif" /> Loading...</div> : null }
          { this.state.error ? <div className="section error">{this.state.error}</div> : null }
          { this.state.firebaseData ? this.renderPage() : null }
        </div>
      </div>
    </div>
  }
}