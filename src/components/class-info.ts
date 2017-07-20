const superagent = require("superagent")
import escapeFirebaseKey from "./escape-firebase-key"
import {SuperagentError, SuperagentResponse, UserName} from "./types"

export class User {
  first_name: string
  last_name: string
  email: string
}

export interface ClassInfoResultResponse {
  response_type?: string
  message?: string
  name: string
  class_hash: string
  students: Array<User>
  teachers: Array<User>
}

export interface AllClassInfo {
  name: string
  classHash: string
  userNames: UserNameCache
}



export interface UserNameCache {
  [key: string]: UserName
}

export interface GetUserName {
  found: boolean
  name: UserName
}

type EndpointCallback = (err: string|null, results:AllClassInfo|null) => void
type GetUserNameCallback = (err: string|null, names:UserNameCache) => void
type GetClassInfoCallback = (err:string|null, info:AllClassInfo) => void

export class ClassInfo {
  private name:string|null
  private classHash:string|null
  private userNames:UserNameCache
  private anonymousUserNames:UserNameCache
  private nextAnonymousId:number
  private callbacks:Array<EndpointCallback>

  constructor (private classInfoUrl:string) {
    this.name = null
    this.userNames = {}
    this.anonymousUserNames = {}
    this.nextAnonymousId = 1
    this.callbacks = []
  }

  getClassInfo(callback:GetClassInfoCallback) {
    if (this.name && this.classHash) {
      callback(null, {
        name: this.name,
        classHash: this.classHash,
        userNames: this.userNames
      })
    }
    else {
      this.callEndpoint(callback)
    }
  }

  getUserName(email:string):GetUserName {
    const key = escapeFirebaseKey(email)
    if (this.userNames[key] !== undefined) {
      return {
        found: true,
        name: this.userNames[key]
      }
    }
    if (this.anonymousUserNames[key] !== undefined) {
      return {
        found: true,
        name: this.anonymousUserNames[key]
      }
    }
    this.anonymousUserNames[key] = {
      firstName: "Student",
      lastName: String(this.nextAnonymousId++)
    }
    return {
      found: false,
      name: this.anonymousUserNames[key]
    }
  }

  getStudentNames(callback:GetUserNameCallback) {
    this.callEndpoint((err, result) => {
      callback(err, this.userNames)
    })
  }

  private callEndpoint(callback:EndpointCallback) {
    // only allow one in-flight
    this.callbacks.push(callback)
    if (this.callbacks.length > 1) {
      return
    }

    superagent
      .get(this.classInfoUrl)
      .withCredentials()
      .set('Accept', 'application/json')
      .end((err:SuperagentError, res:SuperagentResponse) => {
        try {
          const result:ClassInfoResultResponse = JSON.parse(res.text)
          let allInfo:AllClassInfo|null = null
          let error:string|null = null

          if (result.response_type !== "ERROR") {
            this.name = result.name
            this.classHash = result.class_hash

            this.userNames = {}
            result.students.forEach((student) => {
              this.userNames[escapeFirebaseKey(student.email)] = {
                firstName: student.first_name,
                lastName: student.last_name
              }
            })
            allInfo = {
              name: result.name,
              classHash: result.class_hash,
              userNames: this.userNames
            }
          }
          else if (result.message) {
            error = result.message
          }
          this.callbacks.forEach((cb) => {
            cb(error, allInfo)
          })
        }
        catch (e) {}
      });
  }
}