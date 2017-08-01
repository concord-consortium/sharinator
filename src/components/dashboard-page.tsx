import * as React from "react";
import { Interactive, InteractiveMap, User, UserMap, UserInteractive, Activity, ClassListItem, FirebaseRef, Firebase, FirebaseSnapshot, FirebaseInteractive, FirebaseUser, FirebaseData, FirebaseUserInteractive} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"

declare var firebase: Firebase

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
  selectedClass: string|null
  users: User[]
  interactives: Interactive[]
  rowDates: RowDate[]
  sorts: SortSelection[]
  classes: ExtendedClassInfo[]
}

interface DashboardRow {
  id: number,
  user: User
  className: string
  interactive: UserInteractive
  version: number
  rowDate: RowDate
  _class: ExtendedClassInfo
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

type SortCol = "user"|"class"|"interactive"|"date"
type SortDir = "asc"|"desc"
interface SortSelection {
  col: SortCol
  dir: SortDir
}

interface ExtendedClassInfo {
  url: string
  info: ClassInfo
  classroomRef: FirebaseRef|null
  interactives: Interactive[]
  users: User[]
  name: string
}
interface ClassInfoMap {
  [url: string]: ExtendedClassInfo
}

export type ClickHandler = (e:React.MouseEvent<HTMLAnchorElement>) => void

export class DashboardPage extends React.Component<DashboardPageProps, DashboardPageState> {

  private classInfoMap:ClassInfoMap

  constructor(props: DashboardPageProps) {
    super(props)

    this.selectUser = this.selectUser.bind(this)
    this.selectInteractive = this.selectInteractive.bind(this)
    this.selectDate = this.selectDate.bind(this)
    this.selectClass = this.selectClass.bind(this)
    this.appendSort = this.appendSort.bind(this)

    this.state = {
      rows: [],
      users: [],
      interactives: [],
      rowDates: [],
      selectedUser: null,
      selectedInteractive: null,
      selectedDate: null,
      selectedClass: null,
      sorts: [],
      classes: []
    }

    this.classInfoMap = {}
  }

  componentWillMount() {
    this.setState({selectedClass: this.props.class})
    this.loadClasses()
  }

  componentWillReceiveProps(nextProps: DashboardPageProps) {
    this.loadClasses()
  }

  loadClasses() {
    let classes = this.props.classes.slice().map((classListItem) => classListItem.uri)
    if (this.props.class && this.props.classInfo) {
      // ensure that class in url is processed first
      classes = classes.filter((_class) => _class !== this.props.class)
      classes.push(this.props.class)
      if (!this.classInfoMap[this.props.class]) {
        this.classInfoMap[this.props.class] = {
          url: this.props.class,
          classroomRef: null,
          info: this.props.classInfo,
          users: [],
          interactives: [],
          name: ""
        }
      }
    }

    this._loadClasses(classes)
  }

  _loadClasses(classInfoUrls:string[]) {
    const classInfoUrl = classInfoUrls.pop()
    if (classInfoUrl) {
      let extendedClassInfo = this.classInfoMap[classInfoUrl]
      let classInfo = extendedClassInfo ? extendedClassInfo.info : new ClassInfo(classInfoUrl)
      if (!extendedClassInfo) {
        extendedClassInfo = this.classInfoMap[classInfoUrl] = {
          url: classInfoUrl,
          classroomRef: null,
          info: classInfo,
          users: [],
          interactives: [],
          name: ""
        }
      }

      classInfo.getClassInfo((err, info) => {
        if (!err) {
          extendedClassInfo.name = info.name

          if (!extendedClassInfo.classroomRef) {
            extendedClassInfo.classroomRef = firebase.database().ref(`classes/${info.classHash}`)
            if (extendedClassInfo.classroomRef) {
              extendedClassInfo.classroomRef.on("value", (snapshot:FirebaseSnapshot) => {
                const activity:Array<Activity> = []
                const firebaseData:FirebaseData = snapshot.val()
                let user:User|null = null
                let userInteractive:UserInteractive|null = null
                let error:string|null = null
                let createdAt:number|null = null
                const interactiveMap:InteractiveMap = {}

                if (firebaseData) {
                  if (firebaseData.interactives) {
                    Object.keys(firebaseData.interactives).forEach((firebaseInteractiveId) => {
                      const firebaseInteractive:FirebaseInteractive = firebaseData.interactives[firebaseInteractiveId]
                      const interactive:Interactive = {
                        id: firebaseInteractiveId,
                        name: firebaseInteractive.name,
                        users: {}
                      }
                      extendedClassInfo.interactives.push(interactive)
                      interactiveMap[firebaseInteractiveId] = interactive
                    })
                  }

                  if (firebaseData.users) {
                    Object.keys(firebaseData.users).forEach((firebaseUserId) => {
                      const firebaseUser:FirebaseUser = firebaseData.users[firebaseUserId]
                      const userName = extendedClassInfo.info.getUserName(firebaseUserId)
                      const user:User = {
                        id: firebaseUserId,
                        name: userName.name,
                        interactives: {}
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
                      extendedClassInfo.users.push(user)
                    })
                  }

                  this.generateRows()
                }
              })
            }
          }
        }
        this._loadClasses(classInfoUrls)
      })
    }
  }

  generateRows() {
    const rows:DashboardRow[] = []
    const users:User[] = []
    const interactives:Interactive[] = []
    const dates:RowDateHash = {}
    const rowDates:RowDate[] = []
    const classes:ExtendedClassInfo[] = []
    let index = 1

    Object.keys(this.classInfoMap).forEach((classInfoUrl) => {
      const extendedClassInfo = this.classInfoMap[classInfoUrl]
      classes.push(extendedClassInfo)

      extendedClassInfo.users.forEach((user) => {
        const existingUsers = users.filter((_user) => _user.id === user.id)
        if (existingUsers.length === 0) {
          users.push(user)
        }

        Object.keys(user.interactives).forEach((id) => {
          const interactives = user.interactives[id]
          const interactive = interactives[0]
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
            className: extendedClassInfo.name || "",
            interactive: interactive,
            version: interactives.length,
            rowDate: rowDate,
            _class: extendedClassInfo
          })

          if (!dates[date]) {
            dates[date] = rowDate
          }
        })
      })

      extendedClassInfo.interactives.forEach((interactive) => {
        const existingInteractives = interactives.filter((_interactive) => _interactive.id === interactive.id)
        if (existingInteractives.length === 0) {
          interactives.push(interactive)
        }
      })
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

    interactives.sort((a, b) => {
      if (a.name < b.name) return -1
      if (a.name > b.name) return 1
      return 0
    })

    this.sortRows(rows, this.state.sorts)

    this.setState({
      rows: rows,
      users: users,
      interactives: interactives,
      rowDates: rowDates,
      classes: classes
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

  selectClass(e:React.ChangeEvent<HTMLSelectElement>) {
    const classes = this.state.classes.filter((_class) => _class.url === e.target.value)
    this.setState({selectedClass: classes.length > 0 ? classes[0].url : null})
  }

  appendSort(col: SortCol, dir: SortDir) {
    return (e:React.MouseEvent<HTMLSpanElement>) => {
      // remove existing sorts on the column
      const sorts = this.state.sorts.filter((sort) => sort.col !== col)
      sorts.push({col, dir})
      this.setState({sorts})
      this.sortRows(this.state.rows, sorts)
    }
  }

  sortClass(col: SortCol, dir: SortDir) {
    const sorts = this.state.sorts.filter((sort) => sort.col === col && sort.dir === dir)
    return sorts.length > 0 ? "sort-active" : ""
  }

  sortRows(rows: DashboardRow[], sorts:SortSelection[]) {
    if (sorts.length > 0) {
      const sortedRows = rows.slice()
      const lastSortIndex = sorts.length - 1
      sortedRows.sort((a, b) => {
        return this.sortRow(sorts, lastSortIndex, a, b)
      })
      this.setState({rows: sortedRows})
    }
  }

  sortRow(sorts: SortSelection[], sortIndex: number, a: DashboardRow, b: DashboardRow): number {
    const sortByCreatedAt = ():number => {
      if (a.interactive.createdAt < b.interactive.createdAt) return 1
      if (a.interactive.createdAt > b.interactive.createdAt) return -1
      return 0
    }
    const prevSort = ():number => sortIndex > 0 ? this.sortRow(sorts, sortIndex - 1, a, b) : sortByCreatedAt()
    const sort = sorts[sortIndex]
    var negative = sort.dir === "asc" ? -1 : 1
    var positive = -negative
    switch (sort.col) {
      case "user":
        if (a.user.name.fullname < b.user.name.fullname) return negative
        if (a.user.name.fullname > b.user.name.fullname) return positive
        return prevSort()
      case "class":
        if (a.className < b.className) return negative
        if (a.className > b.className) return positive
        return prevSort()
      case "interactive":
        if (a.interactive.name < b.interactive.name) return negative
        if (a.interactive.name > b.interactive.name) return positive
        return prevSort()
      case "date":
        if (a.rowDate.createdAt < b.rowDate.createdAt) return negative
        if (a.rowDate.createdAt > b.rowDate.createdAt) return positive
        return prevSort()
    }
  }

  renderRibbon():JSX.Element {
    return (
      <tr>
        <td>
          <select onChange={this.selectUser} value={this.state.selectedUser ? this.state.selectedUser.id : 0}><option value="0">All Students</option>{ this.state.users.map((user) => <option key={user.id} value={user.id}>{user.name.fullname}</option>)}</select>
          <span className="sort">
            <span onClick={this.appendSort("user", "asc")} className={this.sortClass("user", "asc")}>▲</span>
            <span onClick={this.appendSort("user", "desc")} className={this.sortClass("user", "desc")}>▼</span>
          </span>
        </td>
        <td>
          <select onChange={this.selectClass} value={this.state.selectedClass ? this.state.selectedClass : 0}><option>All Classes</option>{ this.state.classes.map((_class) => <option key={_class.url} value={_class.url}>{_class.name}</option>)}</select>
          <span className="sort">
            <span onClick={this.appendSort("class", "asc")} className={this.sortClass("class", "asc")}>▲</span>
            <span onClick={this.appendSort("class", "desc")} className={this.sortClass("class", "desc")}>▼</span>
          </span>
        </td>
        <td>
          <select onChange={this.selectInteractive} value={this.state.selectedInteractive ? this.state.selectedInteractive.id : 0}><option>All Interactives</option>{ this.state.interactives.map((interactive) => <option key={interactive.id} value={interactive.id}>{interactive.name}</option>)}</select>
          <span className="sort">
            <span onClick={this.appendSort("interactive", "asc")} className={this.sortClass("interactive", "asc")}>▲</span>
            <span onClick={this.appendSort("interactive", "desc")} className={this.sortClass("interactive", "desc")}>▼</span>
          </span>
        </td>
        <td>
          <select onChange={this.selectDate} value={this.state.selectedDate ? this.state.selectedDate.date : 0}><option>All Dates</option>{ this.state.rowDates.map((rowDate) => <option key={rowDate.date} value={rowDate.date}>{rowDate.date}</option>)}</select>
          <span className="sort">
            <span onClick={this.appendSort("date", "asc")} className={this.sortClass("date", "asc")}>▲</span>
            <span onClick={this.appendSort("date", "desc")} className={this.sortClass("date", "desc")}>▼</span>
          </span>
        </td>
      </tr>
    )
  }

  filteredRows():DashboardRow[] {
    return this.state.rows
      .filter((row) => this.state.selectedUser ? row.user.id === this.state.selectedUser.id : true)
      .filter((row) => this.state.selectedInteractive ? row.interactive.id === this.state.selectedInteractive.id : true)
      .filter((row) => this.state.selectedDate ? row.rowDate.date === this.state.selectedDate.date : true)
      .filter((row) => this.state.selectedClass ? row._class.url === this.state.selectedClass : true)
  }

  renderUserInteractive(rowId: number, user:User, userInteractive:UserInteractive, version: number) {
    const key = `${rowId}-${user.id}-${userInteractive.id}`
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
                <td>{this.renderUserInteractive(row.id, row.user, row.interactive, row.version)}</td>
                <td className="rowDate">{row.rowDate.time}</td>
              </tr>
            )
          }) }
        </tbody>
      </table>
    </div>
  }
}