import * as React from "react";
import { Interactive, InteractiveMap, User, UserMap, UserInteractive, Activity, ClassListItem, FirebaseRef, Firebase, FirebaseSnapshot, FirebaseInteractive, FirebaseUser, FirebaseData, FirebaseUserInteractive, SnapshotUserInteractive, FirebaseSavedSnapshot, SnapshotUserInteractiveMap} from "./types"
import { ClassInfo } from "./class-info"
import { ago } from "./ago"
import { PublishResponse, CollabSpace } from "cc-sharing"
import * as refs from "./refs"

declare var firebase: Firebase

export interface DashboardPageProps {
  setSnapshotItem: (snapshotItem:SnapshotUserInteractive) => void
  getSnapshotHref: (snapshotItem:SnapshotUserInteractive) => string
  class: string,
  interactives: Array<Interactive>
  users: Array<User>
  activity: Array<Activity>
  classInfo: ClassInfo
  classes: ClassListItem[]
  authDomain: string
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
  otherVersions: UserInteractive[],
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

interface DashboardRowVersionLinksProps {
  row: DashboardRow
  setSnapshotItem: (snapshotItem:SnapshotUserInteractive) => void
  getSnapshotHref: (snapshotItem:SnapshotUserInteractive) => string
}

interface DashboardRowVersionLinksState {
  showOlderLinks: boolean
}

export class DashboardRowVersionLinks extends React.Component<DashboardRowVersionLinksProps, DashboardRowVersionLinksState> {
  constructor(props: DashboardRowVersionLinksProps) {
    super(props)
    this.toggleOlderLinks = this.toggleOlderLinks.bind(this)
    this.state = {
      showOlderLinks: false
    }
  }

  renderUserInteractiveLinks(userInteractive:UserInteractive, version:number) {
    const links:JSX.Element[] = []
    Object.keys(userInteractive.snapshotMap).forEach((launchUrl) => {
      const snapshotItem = userInteractive.snapshotMap[launchUrl]
      // skip collabspance for now
      // TODO: renable later!
      if ((snapshotItem.type === "application") && snapshotItem.application.type && (snapshotItem.application.type.type === CollabSpace.type)) {
        return
      }
      if (snapshotItem.type === "representation") {
        return
      }
      //const name = snapshotItem.type === "application" ? snapshotItem.application.name : snapshotItem.representation.name
      const name = snapshotItem.application.name
      if (!name || name.length === 0) {
        return
      }
      const href = this.props.getSnapshotHref(snapshotItem)
      const onClick = (e:React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault()
        this.props.setSnapshotItem(snapshotItem)
      }
      //links.push(<li key={launchUrl}><a href={href} onClick={onClick}>{name} <span>#{version}</span></a></li>)
      links.push(<li key={launchUrl}><a href={href} onClick={onClick}>{name}</a> {`#${version}`}</li>)
    })
    if (links.length === 0) {
      return null
    }
    return <ul className="snapshot-links">{links}</ul>
  }

  toggleOlderLinks(e:React.MouseEvent<HTMLElement>) {
    e.preventDefault()
    this.setState({showOlderLinks: !this.state.showOlderLinks})
  }

  renderOlderInterativeLinks(row:DashboardRow) {
    if (row.version <= 1) {
      return null
    }
    const olderLinks:any = []
    if (this.state.showOlderLinks) {
      row.otherVersions.forEach((userInteractive, i) => {
        const version = row.version - i - 1
        const links = this.renderUserInteractiveLinks(userInteractive, version)
        if (links) {
          olderLinks.push(<div key={i}>{links}</div>)
        }
      })
    }
    const showHide = this.state.showOlderLinks ? "Hide" : "Show"
    return <div>
             <div className="show-older-versions" onClick={this.toggleOlderLinks}>{showHide} older versions...</div>
             {olderLinks}
           </div>
  }

  render() {
    const {row} = this.props
    return <div>
            {this.renderUserInteractiveLinks(row.interactive, row.version)}
            {this.renderOlderInterativeLinks(row)}
           </div>
  }
}

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
            extendedClassInfo.classroomRef = refs.makeClassroomRef(this.props.authDomain, info.classHash)
            if (extendedClassInfo.classroomRef) {
              extendedClassInfo.classroomRef.on("value", (snapshot:FirebaseSnapshot) => {
                const activity:Array<Activity> = []
                const firebaseData:FirebaseData = snapshot.val()
                let user:User|null = null
                let userInteractive:UserInteractive|null = null
                let error:string|null = null
                let createdAt:number|null = null
                const interactiveMap:InteractiveMap = {}
                const userMap:UserMap = {}

                const fillSnapshotMap = (snapshot:PublishResponse, savedSnapshot:FirebaseSavedSnapshot, userInteractive:UserInteractive, user:User) => {
                  userInteractive.snapshotMap[snapshot.application.launchUrl] = {type: "application", savedSnapshot, userInteractive, user, application: snapshot.application}
                  snapshot.representations.forEach((representation) => {
                    userInteractive.snapshotMap[representation.dataUrl] = {type: "representation", savedSnapshot, userInteractive, user, representation}
                  })
                  if (snapshot.children) {
                    snapshot.children.forEach((child) => {
                      fillSnapshotMap(child, savedSnapshot, userInteractive, user)
                    })
                  }
                }

                if (firebaseData) {
                  if (firebaseData.interactives) {
                    extendedClassInfo.interactives = []
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

                  if (firebaseData.snapshots) {
                    extendedClassInfo.users = []

                    Object.keys(firebaseData.snapshots).forEach((firebaseInteractiveId) => {
                      const savedSnapshotMap = firebaseData.snapshots[firebaseInteractiveId]

                      const firebaseInteractive = interactiveMap[firebaseInteractiveId]
                      let interactive = interactiveMap[firebaseInteractiveId]
                      if (!interactive) {
                        return
                      }

                      Object.keys(savedSnapshotMap).forEach((savedSnapshotMapKey) => {
                        const savedSnapshot = savedSnapshotMap[savedSnapshotMapKey]
                        const {snapshot} = savedSnapshot

                        const userName = extendedClassInfo.info.getUserName(savedSnapshot.user)
                        let user = userMap[savedSnapshot.user]
                        if (!user) {
                          user = {
                            id: savedSnapshot.user,
                            name: userName.name,
                            interactives: {}
                          }
                          extendedClassInfo.users.push(user)
                          userMap[savedSnapshot.user] = user
                        }

                        const userInteractives = user.interactives[firebaseInteractiveId] = user.interactives[firebaseInteractiveId] || []
                        const userInteractive:UserInteractive = {
                          id: firebaseInteractiveId,
                          name: interactive.name,
                          url: snapshot.application.launchUrl,
                          createdAt: savedSnapshot.createdAt,
                          snapshotMap: {}
                        }
                        userInteractives.push(userInteractive)

                        fillSnapshotMap(snapshot, savedSnapshot, userInteractive, user)

                        activity.push({
                          user: user,
                          userInteractive: userInteractive
                        })
                      })
                    })

                    extendedClassInfo.users.forEach((user) => {
                      Object.keys(user.interactives).forEach((interactiveId) => {
                        user.interactives[interactiveId].sort((a, b) => {return b.createdAt - a.createdAt })
                        const interactive = interactiveMap[interactiveId]
                        if (interactive) {
                          interactive.users[user.id] = user
                        }
                      })
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
            otherVersions: interactives.slice(1),
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

  renderUserInteractive(row:DashboardRow) {
    return <div>
            {row.interactive.name}
            <DashboardRowVersionLinks row={row} getSnapshotHref={this.props.getSnapshotHref} setSnapshotItem={this.props.setSnapshotItem} />
           </div>
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
                <td>{this.renderUserInteractive(row)}</td>
                <td className="rowDate">{row.rowDate.time}</td>
              </tr>
            )
          }) }
        </tbody>
      </table>
    </div>
  }
}