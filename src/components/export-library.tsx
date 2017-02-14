import * as React from "react"
import * as Papa from "papaparse"

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
}

export class ExportLibrary  extends React.Component<ExportLibraryProps, ExportLibraryState> {

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
    else if ((window as any).attachEvent) {
      (window as any).attachEvent("onmessage", this.handleMessage)
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

              if (copied) {
                alert("The table has been copied to the clipboard.  You can now paste it into a Google Doc.")
                return
              }
            }
          }

          if ((results.errors.length > 0) || !copied) {
            alert("Sorry, the table could not be copied to the clipboard.")
          }
        }
      })
    }
  }

  render() {
    var items, i

    if (this.state.items.length > 0) {
      items = []
      for (i = 0; i < this.state.items.length; i++) {
        const item = this.state.items[i]
        if (item.type === "image") {
          items.push(<img key={i} className="exported" src={`data:image/png;base64,${this.state.items[i].content}`} />)
        }
        else {
          items.push(<a key={i} onClick={this.createCSVClickHandler(item)} href={`data:text/csv;charset=utf-8,${encodeURIComponent(this.state.items[i].content)}`} ><img src="../assets/img/spreadsheet.png" /></a>)
        }
      }
      return <div id="export-library">
        <div>You can now drag any of the graph snapshots from the list below directly into a Google Doc.</div>
        <div>If you want to insert a table from the list below into a Google Doc first click on it to automatically copy it.  You can then paste it into the Google Doc.</div>
        <div>Finally you can drag any table from the list below back to your activity to import the data.</div>
        <div id="items">{items}</div>
        <div className="buttons"><button className="button button-primary" onClick={this.clearItems}>Clear Items</button></div>
      </div>
    }
    else if (this.state.error !== null) {
      return <div id="export-library"><div>{this.state.error}</div></div>
    }
    else {
      return <div id="export-library">
               <div>Select any graph or table to the left and then click on the camera icon to export the data to here.</div>
             </div>
    }
  }
}
