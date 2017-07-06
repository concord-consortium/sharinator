import * as React from "react";
import { Interactive, InteractiveMap, User, UserMap, UserInteractive, Activity} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"

export interface ClassroomPageProps {
  setUserInteractive:(user:User, interactive:UserInteractive) => void
  getInteractiveHref: (user:User, userInteractive:UserInteractive) => string
  class: string,
  interactives: Array<Interactive>
  users: Array<User>
  activity: Array<Activity>
  classInfo: ClassInfo
}

export type Tab = "users" | "interactives" | "activity"

export interface ClassroomPageState {
  currentTab: Tab
}

export type ClickHandler = (e:React.MouseEvent<HTMLAnchorElement>) => void

export class ClassroomPage extends React.Component<ClassroomPageProps, ClassroomPageState> {

  constructor(props: ClassroomPageProps) {
    super(props)

    this.state = {
      currentTab: "users"
    }
  }

  createOnClick(href: string, user:User, userInteractive:UserInteractive):ClickHandler {
    return (e:React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault()
      this.props.setUserInteractive(user, userInteractive)
    }
  }

  renderUser(user:User):JSX.Element {
    const interactives:Array<JSX.Element> = Object.keys(user.interactives).map<JSX.Element>((interactiveId) => {
      const userInteractives = user.interactives[interactiveId]
      const userInteractive = userInteractives[0]
      const key = `${user.id}-${interactiveId}`
      const href = this.props.getInteractiveHref(user, userInteractive)
      const onClick = this.createOnClick(href, user, userInteractive)
      return <span key={key}><a href={href} onClick={onClick}>{userInteractive.name}</a> ({userInteractives.length})</span>
    })

    return <tr key={user.id}>
             <td>{user.name}</td>
             <td>{interactives}</td>
           </tr>
  }

  renderInteractive(interactive:Interactive):JSX.Element {
    const users:Array<JSX.Element> = Object.keys(interactive.users).map<JSX.Element>((userId) => {
      const user = interactive.users[userId]
      const userInteractives = user.interactives[interactive.id]
      const userInteractive = userInteractives[0]
      const key = `${user.id}-${interactive.id}`
      const href = this.props.getInteractiveHref(user, userInteractive)
      const onClick = this.createOnClick(href, user, userInteractive)
      return <span key={key}><a href={href} onClick={onClick}>{user.name}</a> ({userInteractives.length})</span>
    })

    return <tr key={interactive.id}>
             <td>{interactive.name}</td>
             <td>{users}</td>
           </tr>
  }

  renderUsers():JSX.Element {
    if (this.props.users.length === 0) {
      return <div>No teachers or students have published any interactives yet</div>
    }
    return <table className="u-full-width">
             <thead>
               <tr>
                 <th>User</th>
                 <th>Published Interactives</th>
               </tr>
             </thead>
             <tbody>
               {this.props.users.map(this.renderUser.bind(this))}
             </tbody>
           </table>
  }

  renderInteractives():JSX.Element {
    if (this.props.interactives.length === 0) {
      return <div>No interactives have been published yet</div>
    }
    return <table className="u-full-width">
             <thead>
               <tr>
                 <th>Published Interactive</th>
                 <th>Users</th>
               </tr>
             </thead>
             <tbody>
               {this.props.interactives.map(this.renderInteractive.bind(this))}
             </tbody>
           </table>
  }

  renderActivity(activity:Activity, index:number):JSX.Element {
    const href = this.props.getInteractiveHref(activity.user, activity.userInteractive)
    const onClick = this.createOnClick(href, activity.user, activity.userInteractive)
    return <div className="activity" key={`${activity.user.id}-${activity.userInteractive.id}-${index}`}>
            {activity.user.name} published
            <a href={href} onClick={onClick}>{activity.userInteractive.name}</a>
            {ago(activity.userInteractive.createdAt)}
           </div>
  }

  renderActivityList():JSX.Element {
    if (this.props.activity.length === 0) {
      return <div>There has been no activity in this classroom yet</div>
    }
    return <div className="activity-list">{this.props.activity.map(this.renderActivity.bind(this))}</div>
  }

  renderTabs() {
    const selectTab = (tab:Tab) => {
      return () => {
        this.setState({currentTab: tab})
      }
    }
    return <ul className="tab">
             <li className={this.state.currentTab === "users" ? "active" : ""}><span onClick={selectTab("users")}>Users</span></li>
             <li className={this.state.currentTab === "interactives" ? "active" : ""}><span onClick={selectTab("interactives")}>Interactives</span></li>
             <li className={this.state.currentTab === "activity" ? "active" : ""}><span onClick={selectTab("activity")}>Activity</span></li>
           </ul>
  }

  renderCurrentTab() {
    switch (this.state.currentTab) {
      case "users":
        return this.renderUsers()
      case "interactives":
        return this.renderInteractives()
      case "activity":
        return this.renderActivityList()
    }
  }

  render() {
    return <div className="page">
      { this.renderTabs() }
      { this.renderCurrentTab() }
    </div>
  }
}