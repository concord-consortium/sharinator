import * as React from "react";
import { IFrameSidebar } from "./iframe-sidebar"
import { AuthoredState } from "./iframe"
import { parseCODAPUrlIntoAuthoredState, parseCollaborationSpaceUrlIntoAuthoredState } from "./url-parsers"
import { ClassInfoResultResponse, User } from "./class-info"
import { Firebase } from "./types"
const queryString = require("query-string")
const superagent = require("superagent")
import * as refs from "./refs"

const UID_LENGTH = 40

declare var firebase: Firebase

export interface DemoFirebaseSnapshot {
  val: () => FirebaseDemo
}

export interface DemoProps {
}

export type AppType = "CODAP" | "CollabSpace"

export interface DemoState {
  error: string|null
  appType: AppType
  appURL: string
  numTeachers: number
  numStudents: number
  demoUID: string|null
  demo?: FirebaseDemo
}

export interface DemoInteractiveState {

}

export interface DemoUser {
  name: string
  type: "student"|"teacher"
  email: string
  index: number
  interactiveState: DemoInteractiveState|null
}

export interface DemoUserMap {
  [key: string]: DemoUser
}

export interface FirebaseDemo {
  authoredState: AuthoredState,
  users: DemoUserMap,
  classInfo: ClassInfoResultResponse
}

export function getParam(name:string):string {
  let value = ""
  const params = (window.location.search.substr(1) || "").split("&")
  params.forEach((param) => {
    const [key, keyValue, ...rest] = param.split("=")
    if (key === name) {
      value = keyValue
    }
  })
  return value
}

export function generateUID():string {
  let i = 0
  const uid:string[] = []
  for (i = 0; i < UID_LENGTH; i++) {
    uid.push(String.fromCharCode(65 + (Math.random() * 26)))
  }
  return uid.join("")
}

export function getUID(name:string):string|null {
  const demoParam = getParam(name)
  return demoParam.length === UID_LENGTH ? demoParam : null
}

export class Demo extends React.Component<DemoProps, DemoState> {

  refs: {
    urlType: HTMLSelectElement
    appURL: HTMLInputElement
    numTeachers: HTMLInputElement
    numStudents: HTMLInputElement
    grouped: HTMLInputElement
  }

  constructor(props: DemoProps) {
    super(props)
    const demoUID = getUID("demo")
    this.state = {
      error: null,
      appType: "CODAP",
      appURL: "",
      numTeachers: 1,
      numStudents: 10,
      demoUID: demoUID,
    }

    if (demoUID) {
      const demo = refs.makeDemoRef(demoUID)
      demo.once("value", (snapshot:DemoFirebaseSnapshot) => {
        const firebaseData:FirebaseDemo = snapshot.val()
        this.setState({demo: firebaseData})
      })
    }
  }

  numberChanged(e: React.ChangeEvent<HTMLInputElement>, input:HTMLInputElement) {
    const intValue = e.currentTarget.value === "" ? 0 : parseInt(e.currentTarget.value, 10)
    if (!isNaN(intValue)) {
      if (input === this.refs.numTeachers) {
        this.setState({numTeachers: intValue})
      }
      else {
        this.setState({numStudents: intValue})
      }
    }
  }

  formSubmitted(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const appURL = this.refs.appURL.value
    const urlType = this.refs.urlType.value
    const grouped = this.refs.grouped.checked
    try {
      const authoredState = urlType === "CODAP" ? parseCODAPUrlIntoAuthoredState(appURL, grouped) : parseCollaborationSpaceUrlIntoAuthoredState(appURL, grouped)
      const demoUID = generateUID()
      const users:DemoUserMap = {}
      const teachers:User[] = []
      const students:User[] = []
      let i = 0

      for (i = 0; i < this.state.numTeachers; i++) {
        const userUID = generateUID()
        users[generateUID()] = {
          index: i,
          type: "teacher",
          name: `Teacher ${i+1}`,
          email: `teacher${i+1}@example.com`,
          interactiveState: null
        }
        teachers.push({
          first_name: "Teacher",
          last_name: `${i+1}`,
          email: `teacher${i+1}@example.com`
        })
      }

      for (i = 0; i < this.state.numStudents; i++) {
        users[generateUID()] = {
          index: i,
          type: "student",
          name: `Student ${i+1}`,
          email: `student${i+1}@example.com`,
          interactiveState: null
        }
        students.push({
          first_name: "Student",
          last_name: `${i+1}`,
          email: `student${i+1}@example.com`
        })
      }

      const classInfo:ClassInfoResultResponse = {
        name: `Demo ${demoUID}`,
        class_hash: demoUID,
        students: students,
        teachers: teachers
      }

      const demo = refs.makeDemoRef(demoUID)
      const demoInfo:FirebaseDemo = {
        authoredState: authoredState,
        users: users,
        classInfo: classInfo
      }
      demo.set(demoInfo, () => {
        window.location.href = `?demo=${demoUID}`
      })
    }
    catch (e) {
      this.setState({error: e.message})
    }
  }

  renderLinks() {
    if (!this.state.demo) {
      return <div>Loading...</div>
    }

    const users = this.state.demo.users
    const teacherLinks:JSX.Element[] = []
    const studentLinks:JSX.Element[] = []
    let i = 0;

    Object.keys(users).forEach((userUID) => {
      const user = users[userUID]
      const link = <li key={userUID}><a href={`../iframe/?demo=${this.state.demoUID}&demoUser=${userUID}`} target="_blank">{user.name}</a></li>
      if (user.type === "teacher") {
        teacherLinks[user.index] = link
      }
      else {
        studentLinks[user.index] = link
      }
    })

    return (
      <div>
        <h1>Demo Links</h1>
        <h2>Teachers</h2>
        <ul>{teacherLinks}</ul>
        <h2>Students</h2>
        <ul>{studentLinks}</ul>
      </div>
    )
  }

  renderForm() {
    return (
      <form onSubmit={this.formSubmitted.bind(this)}>
        <h1>Demo Creator</h1>
        {this.state.error ? <div className="error">{this.state.error}</div> : null}
        <label htmlFor="urlType">App URL Type</label>
        <select ref="urlType" defaultValue={this.state.appType}>
          <option value="CODAP">CODAP Lara Sharing URL</option>
          <option value="CollabSpace">Collaboration Space URL</option>
        </select>
        <label htmlFor="appURL">App URL</label>
        <input type="text" ref="appURL" placeholder="URL here..." defaultValue={this.state.appURL} />
        <label htmlFor="numTeachers">Number of Teachers</label>
        <input type="text" ref="numTeachers" value={this.state.numTeachers > 0 ? this.state.numTeachers : ""} onChange={(e) => this.numberChanged(e, this.refs.numTeachers)} />
        <label htmlFor="numStudents">Number of Students</label>
        <input type="text" ref="numStudents" value={this.state.numStudents > 0 ? this.state.numStudents : ""} onChange={(e) => this.numberChanged(e, this.refs.numStudents)} />
        <label>Options</label>
        <input type="checkbox" ref="grouped" value="1" /> Grouped Activity
        <div>
          <input type="submit" value="Create Demo" />
        </div>
      </form>
    )
  }

  render() {
    if (this.state.demoUID) {
      return this.renderLinks()
    }
    return this.renderForm()
  }
}