import * as React from "react";
import {SharingClient, SharableApp, Representation, Text} from "cc-sharing"
import {IFramePhone} from "./types"
const queryString = require("query-string")

declare var iframePhone: IFramePhone

type ResolvePublish = (value?: Representation[] | PromiseLike<Representation[]> | undefined) => void
type RejectPublish = (reason?: any) => void

export interface CodapShimProps {
}

export interface CodapShimState {
  codapUrl: string
}

export class CodapShim extends React.Component<CodapShimProps, CodapShimState> {
  private sharinatorPrefix = /^Sharinator/

  constructor(props: CodapShimProps) {
    super(props)

    this.handlePublish = this.handlePublish.bind(this)

    const query = queryString.parse(location.search)

    const phone:IFramePhone = iframePhone.getIFrameEndpoint()
    phone.initialize()

    const sharableApp:SharableApp = {
      application: {
        launchUrl: window.location.toString(),
        name: "CODAP (shim)"
      },
      getDataFunc: (context) => {
        return new Promise(this.handlePublish)
      }
    }

    const sharingClient = new SharingClient(phone, sharableApp)

    this.state = {
      codapUrl: query.codapUrl
    }
  }

  refs: {
    iframe: HTMLIFrameElement
  }

  componentWillMount() {

    window.addEventListener("message", (e:MessageEvent) => {
      if (e.source !== window.parent) {
        window.parent.postMessage(e.data, "*")
      }
      else if (this.refs.iframe && this.refs.iframe.contentWindow) {
        // sharinator messages from the parent (Sharinator) are handled by sharingClient
        if (!this.isSharinatorMessage(e)) {
          this.refs.iframe.contentWindow.postMessage(e.data, "*")
        }
      }
    })
  }

  isSharinatorMessage(e:MessageEvent):boolean {
    let isSharinatorMessage = false
    try {
      const message = JSON.parse(e.data)
      if (message && message.type) {
        isSharinatorMessage = this.sharinatorPrefix.test(message.type)
      }
    }
    catch (e) {}
    return isSharinatorMessage
  }

  handlePublish(resolve:ResolvePublish, reject:RejectPublish) {
    resolve([
      {
        type: Text,
        dataUrl: "test"
      }
    ])
  }

  render() {
    return <iframe ref="iframe" src={this.state.codapUrl}></iframe>
  }
}