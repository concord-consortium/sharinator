import * as React from "react";
import { Interactive, InteractiveMap, User, UserMap, UserInteractive, Activity, ClassListItem} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"

export interface DashboardPageProps {
  setUserInteractive:(user:User, interactive:UserInteractive) => void
  getInteractiveHref: (user:User, userInteractive:UserInteractive) => string
  class: string,
  interactives: Array<Interactive>
  users: Array<User>
  activity: Array<Activity>
  classInfo: ClassInfo
  classes: ClassListItem[]
}

export type Tab = "users" | "interactives" | "activity"

export interface DashboardPageState {
  rows: DashboardRow[]
  selectedUser: User|null
  selectedInteractive: Interactive|null
  selectedDate: RowDate|null
  users: User[]
  interactives: Interactive[]
  rowDates: RowDate[]
}

interface DashboardRow {
  id: number,
  user: User
  className: string
  interactive: UserInteractive
  version: number
  rowDate: RowDate
}

export interface RowDate {
  createdAt: number
  date: string
  time: string
  start: number
  end: number
}

export interface RowDateHash {
  [s: string]: RowDate
}

export type ClickHandler = (e:React.MouseEvent<HTMLAnchorElement>) => void

export class DashboardPage extends React.Component<DashboardPageProps, DashboardPageState> {

  constructor(props: DashboardPageProps) {
    super(props)

    this.selectUser = this.selectUser.bind(this)
    this.selectInteractive = this.selectInteractive.bind(this)
    this.selectDate = this.selectDate.bind(this)
    this.createSort = this.createSort.bind(this)

    this.state = {
      rows: [],
      users: [],
      interactives: [],
      rowDates: [],
      selectedUser: null,
      selectedInteractive: null,
      selectedDate: null
    }

  }

  componentWillMount() {
    this.generateRows(this.props)
  }

  componentWillReceiveProps(nextProps: DashboardPageProps) {
    this.generateRows(nextProps)
  }

  generateRows(props: DashboardPageProps) {
    const rows:DashboardRow[] = []
    const users:User[] = []
    const interactives:Interactive[] = []
    const dates:RowDateHash = {}
    const rowDates:RowDate[] = []
    let index = 1

    this.props.classInfo.getClassInfo((err, info) => {
      props.users.forEach((user) => {
        users.push(user)

        Object.keys(user.interactives).forEach((id) => {
          const interactives = user.interactives[id]
          const interactive = interactives[0]
          //interactives.forEach((interactive, interactiveIndex) => {
            const created = new Date(interactive.createdAt)
            const date = created.toDateString()
            const rowDate = {
              createdAt: interactive.createdAt,
              date: date,
              time: `${date} ${created.toTimeString().split(' ')[0]}`,
              start: (new Date(date + " 00:00:00")).getTime(),
              end: (new Date(date + " 23:59:59")).getTime()
            }

            rows.push({
              id: index++,
              user: user,
              className: info.name,
              interactive: interactive,
              version: interactives.length,
              rowDate: rowDate
            })

            if (!dates[date]) {
              dates[date] = rowDate
            }
          //})
        })
      })
      rows.sort((a, b) => {
        if (a.interactive.createdAt < b.interactive.createdAt) return 1
        if (a.interactive.createdAt > b.interactive.createdAt) return -1
        return 0
      })

      users.sort((a, b) => {
        if (a.name.fullname < b.name.fullname) return -1
        if (a.name.fullname > b.name.fullname) return 1
        return 0
      })

      Object.keys(dates).forEach((date) => {
        rowDates.push(dates[date])
      })
      rowDates.sort((a, b) => {
        if (a.createdAt < b.createdAt) return -1
        if (a.createdAt > b.createdAt) return 1
        return 0
      })

      props.interactives.forEach((interactive) => {
        interactives.push(interactive)
      })
      interactives.sort((a, b) => {
        if (a.name < b.name) return -1
        if (a.name > b.name) return 1
        return 0
      })

      this.setState({
        rows: rows,
        users: users,
        interactives: interactives,
        rowDates: rowDates
      })
    })

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
             <td>{user.name.fullname}</td>
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
      return <span key={key}><a href={href} onClick={onClick}>{user.name.fullname}</a> ({userInteractives.length})</span>
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
            {activity.user.name.fullname} published
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

  selectUser(e:React.ChangeEvent<HTMLSelectElement>) {
    const users = this.state.users.filter((user) => user.id === e.target.value)
    this.setState({selectedUser: users.length > 0 ? users[0] : null})
  }

  selectInteractive(e:React.ChangeEvent<HTMLSelectElement>) {
    const interactives = this.state.interactives.filter((interactive) => interactive.id === e.target.value)
    this.setState({selectedInteractive: interactives.length > 0 ? interactives[0] : null})
  }

  selectDate(e:React.ChangeEvent<HTMLSelectElement>) {
    const rowDates = this.state.rowDates.filter((rowDate) => rowDate.date === e.target.value)
    this.setState({selectedDate: rowDates.length > 0 ? rowDates[0] : null})
  }

  createSort(col:"user"|"class"|"interactive"|"date", dir:"asc"|"desc") {
    var negative = dir === "asc" ? -1 : 1
    return (e:React.MouseEvent<HTMLSpanElement>) => {
      const rows = this.state.rows.slice().sort((a, b) => {
        switch (col) {
          case "user":
            if (a.user.name.fullname < b.user.name.fullname) return negative
            if (a.user.name.fullname > b.user.name.fullname) return -negative
            return 0
          case "class":
            if (a.className < b.className) return negative
            if (a.className > b.className) return -negative
            return 0
          case "interactive":
            if (a.interactive.name < b.interactive.name) return negative
            if (a.interactive.name > b.interactive.name) return -negative
            return 0
          case "date":
            if (a.rowDate.createdAt < b.rowDate.createdAt) return negative
            if (a.rowDate.createdAt > b.rowDate.createdAt) return -negative
            return 0
        }
      })
      this.setState({rows: rows})
    }
  }

  renderRibbon():JSX.Element {
    return (
      <tr>
        <td>
          <select onChange={this.selectUser} value={this.state.selectedUser ? this.state.selectedUser.id : 0}><option value="0">All Students</option>{ this.state.users.map((user) => <option key={user.id} value={user.id}>{user.name.fullname}</option>)}</select>
          <span className="sort"><span onClick={this.createSort("user", "asc")}>▲</span> <span onClick={this.createSort("user", "desc")}>▼</span></span>
        </td>
        <td>
          <select><option>All Classes</option><option>Martha and Daphne’s Shared Class</option></select>
          <span className="sort"><span onClick={this.createSort("class", "asc")}>▲</span> <span onClick={this.createSort("class", "desc")}>▼</span></span>
        </td>
        <td>
          <select onChange={this.selectInteractive} value={this.state.selectedInteractive ? this.state.selectedInteractive.id : 0}><option>All Interactives</option>{ this.state.interactives.map((interactive) => <option key={interactive.id} value={interactive.id}>{interactive.name}</option>)}</select>
          <span className="sort"><span onClick={this.createSort("interactive", "asc")}>▲</span> <span onClick={this.createSort("interactive", "desc")}>▼</span></span>
        </td>
        <td>
          <select onChange={this.selectDate} value={this.state.selectedDate ? this.state.selectedDate.date : 0}><option>All Dates</option>{ this.state.rowDates.map((rowDate) => <option key={rowDate.date} value={rowDate.date}>{rowDate.date}</option>)}</select>
          <span className="sort"><span onClick={this.createSort("date", "asc")}>▲</span> <span onClick={this.createSort("date", "desc")}>▼</span></span>
        </td>
      </tr>
    )
  }

  filteredRows():DashboardRow[] {
    return this.state.rows
      .filter((row) => this.state.selectedUser ? row.user.id === this.state.selectedUser.id : true)
      .filter((row) => this.state.selectedInteractive ? row.interactive.id === this.state.selectedInteractive.id : true)
      .filter((row) => this.state.selectedDate ? row.rowDate.date === this.state.selectedDate.date : true)
  }

  renderUserInteractive(user:User, userInteractive:UserInteractive, version: number) {
    const key = `${user.id}-${userInteractive.id}`
    const href = this.props.getInteractiveHref(user, userInteractive)
    const onClick = this.createOnClick(href, user, userInteractive)
    return <a href={href} onClick={onClick}>{userInteractive.name} <span>#{version}</span></a>
  }

  render() {
    return <div className="page">
      <table className="dashboard">
        <tbody>
          { this.renderRibbon() }
          { this.filteredRows().map((row) => {
            return (
              <tr key={row.id}>
                <td>{row.user.name.fullname}</td>
                <td>{row.className}</td>
                <td>{this.renderUserInteractive(row.user, row.interactive, row.version)}</td>
                <td className="rowDate">{row.rowDate.time}</td>
              </tr>
            )
          }) }
        </tbody>
      </table>
    </div>
  }
}