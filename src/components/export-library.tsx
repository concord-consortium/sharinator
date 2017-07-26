import * as React from "react"
import * as Papa from "papaparse"
import { Window } from "./types"

const base64url = require("base64-url")

export interface ExportLibraryProps {
}

export interface ExportLibraryState {
  items: ExportItem[]
  error: string|null
}

interface ExportItem {
  type: "image" | "csv"
  content: string
  copied?: boolean
}

export class ExportLibrary extends React.Component<ExportLibraryProps, ExportLibraryState> {

  constructor(props: ExportLibraryProps) {
    super(props)
    this.state = {
      items: [],
      error: null
    }

    this.handleMessage = this.handleMessage.bind(this)
    this.clearItems = this.clearItems.bind(this)
    this.createCSVClickHandler = this.createCSVClickHandler.bind(this)
  }

  componentWillMount() {
    if (window.addEventListener) {
      window.addEventListener("message", this.handleMessage, false)
    }
    else if ((window as Window).attachEvent) {
      (window as Window).attachEvent("onmessage", this.handleMessage)
    }
    else {
      this.setState({error: "ERROR: unable to setup snapshot event listeners"})
    }
  }

  handleMessage(event:MessageEvent) {
    if (!event.data) {
      return
    }
    const {action, extension, mimeType, content} = event.data
    if (action === "saveSecondaryFile") {
      if (mimeType === "image/png") {
        this.setState({
          items: this.state.items.concat({
            type: "image",
            content: content
          })
        })
      }
      else if ((mimeType === "text/plain") && (extension === "csv")) {
        this.setState({
          items: this.state.items.concat({
            type: "csv",
            content: content
          })
        })
      }
    }
  }

  clearItems() {
    if (confirm("Are you sure you want to clear all the items?")) {
      this.setState({items: []})
    }
  }

  createCSVClickHandler(item:ExportItem) {
    return (e:React.MouseEvent<HTMLAnchorElement|HTMLImageElement>) => {
      e.preventDefault()

      Papa.parse(item.content, {
        complete: (results) => {
          let copied = false

          if (results.errors.length === 0) {
            const header = results.data[0].map((col:string) => {
              return `<th>${col}</th>`
            }).join("")
            const rows = results.data.slice(1).map((row:string[]) => {
              const tds = row.map((col) => {
                return `<td>${col}</td>`
              }).join("")
              return `<tr>${tds}</tr>`
            }).join("")

            const content = `<table width='100%'><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`
            let selection, range, mark
            try {
              const mark = document.createElement("mark")
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

              if (copied) {
                item.copied = true
                setTimeout(() => {
                  item.copied = false
                  this.forceUpdate()
                }, 2000)
                this.forceUpdate()
                return
              }
            }
          }

          const error = (results.errors.length > 0) || !copied ? "Sorry, the table could not be copied to the clipboard." : null
          this.setState({error: error})
        }
      })
    }
  }

  renderItems() {
    const items = []
    let i

    if (this.state.items.length === 0) {
      return null
    }

    for (i = 0; i < this.state.items.length; i++) {
      const item = this.state.items[i]
      if (item.type === "image") {
        const imgItem = (
          <div key={i} className="item">
            <img key={i} className="exported" src={`data:image/png;base64,${this.state.items[i].content}`} />
          </div>
        )
        items.push(imgItem)
      }
      else {
        const csvItem = (
          <div key={i} className="item">
            <a onClick={this.createCSVClickHandler(item)} href={`data:text/csv;charset=utf-8,${encodeURIComponent(this.state.items[i].content)}`} >
              <img src="../assets/img/spreadsheet.png" />
            </a>
            {item.copied ? <span className="copied">COPIED!</span> : null}
          </div>
        )
        items.push(csvItem)
      }
    }
    return (
      <div>
        <div id="items">{items}</div>
        <div className="buttons"><button className="button button-primary" onClick={this.clearItems}>Clear</button></div>
      </div>
    )
  }

  render() {
    return (
      <div id="export-library">
        {this.state.error ? <div id="export-library-error">{this.state.error}</div> : null}
        { this.renderItems() }
      </div>
    )
  }
}
