const superagent = require("superagent")
import escapeFirebaseKey from "./escape-firebase-key"

export class Student {
  first_name: string
  last_name: string
  email: string
}

export class Teacher {
  first_name: string
  last_name: string
}

export interface ClassInfoResultResponse {
  response_type?: string
  message?: string
  name: string
  class_hash: string
  students: Array<Student>
  teachers: Array<Teacher>
}

export interface AllClassInfo {
  name: string
  classHash: string
  studentNames: StudentNameCache
}

interface StudentNameCache {
  [key: string]: string
}

export interface GetStudentName {
  found: boolean
  name: string
}

type EndpointCallback = (err: string|null, results:AllClassInfo|null) => void
type GetStudentNameCallback = (err: string|null, names:StudentNameCache) => void
type GetClassInfoCallback = (err:string|null, info:AllClassInfo) => void

export class ClassInfo {
  private name:string|null
  private classHash:string|null
  private studentNames:StudentNameCache
  private anonymousStudentNames:StudentNameCache
  private nextAnonymousId:number
  private callbacks:Array<EndpointCallback>

  constructor (private classInfoUrl:string) {
    this.name = null
    this.studentNames = {}
    this.anonymousStudentNames = {}
    this.nextAnonymousId = 1
    this.callbacks = []
  }

  getClassInfo(callback:GetClassInfoCallback) {
    if (this.name && this.classHash) {
      callback(null, {
        name: this.name,
        classHash: this.classHash,
        studentNames: this.studentNames
      })
    }
    else {
      this.callEndpoint(callback)
    }
  }

  getStudentName(email:string):GetStudentName {
    const key = escapeFirebaseKey(email)
    if (this.studentNames[key] !== undefined) {
      return {
        found: true,
        name: this.studentNames[key]
      }
    }
    if (this.anonymousStudentNames[key] !== undefined) {
      return {
        found: true,
        name: this.anonymousStudentNames[key]
      }
    }
    this.anonymousStudentNames[key] = `Student ${this.nextAnonymousId++}`
    return {
      found: false,
      name: this.anonymousStudentNames[key]
    }
  }

  getStudentNames(callback:GetStudentNameCallback) {
    this.callEndpoint((err, result) => {
      callback(err, this.studentNames)
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
      .end((err:any, res:any) => {
        try {
          const result:ClassInfoResultResponse = JSON.parse(res.text)
          let allInfo:AllClassInfo|null = null
          let error:string|null = null

          if (result.response_type !== "ERROR") {
            this.name = result.name
            this.classHash = result.class_hash

            this.studentNames = {}
            result.students.forEach((student) => {
              this.studentNames[escapeFirebaseKey(student.email)] = `${student.first_name} ${student.last_name}`
            })
            allInfo = {
              name: result.name,
              classHash: result.class_hash,
              studentNames: this.studentNames
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