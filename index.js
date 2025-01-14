import fetch from "node-fetch"
import { readFile, writeFileSync } from "fs"
import { Octokit } from "@octokit/rest"
const octokit = new Octokit()
import * as dotenv from "dotenv"
dotenv.config()

let asfport = process.env.ASF_PORT || "1242"
let asfhost = process.env.ASF_HOST || "localhost"
let password = process.env.ASF_PASSWORD || ""

let lastLength
readFile("lastlength", function read(err, data) {
  if (!err && data) {
    lastLength = data
  } else if (err.code == "ENOENT") {
    writeFileSync("lastlength", "0")
    lastLength = 0
  } else {
    console.log("Error with lastlength: ", err.code)
  }
})

checkGame()
setInterval(checkGame, 6 * 60 * 60 * 1000) //Runs every six hours

function checkGame() {
  octokit.gists.get({ gist_id: "e8c5cf365d816f2640242bf01d8d3675" }).then(gist => {
    let codes = gist.data.files['Steam Codes'].content.split("\n")

    //THIS IS BAD, and definitely not scalable.
    if (lastLength < codes.length) {
      let lastLengthBeforeRun = lastLength
      if ((lastLength + 40) < codes.length) {
        console.log("Only runs on the last 40 games")
        lastLength = codes.length - 40
      }
      let asfcommand = "!addlicense asf "
      for (lastLength; lastLength < codes.length; lastLength++) {
        asfcommand += codes[lastLength] + ","
      }
      asfcommand = asfcommand.slice(0, -1)

      let command = { Command: asfcommand }
      let url = "http://" + asfhost + ":" + asfport + "/Api/Command"
      let headers = { "Content-Type": "application/json" }
      if (password && password.length > 0) {
        headers["Authentication"] = password
      }

      fetch(url, {
        method: "post",
        body: JSON.stringify(command),
        headers: headers
      })
        .then(res => res.json())
        .then(body => {
          if (body.Success) {
            console.log("Success: " + asfcommand)
            console.debug(body)
            writeFileSync("lastlength", lastLength.toString())
          } else {
            console.log("Error: ")
            console.log(body)
          }
        })
        .catch(err => {
          console.log(`error running '${command["Command"]}':`)
          console.log(err)
          console.log("Trying again in six hours")
          lastLength = lastLengthBeforeRun
        })
    } else {
      console.log("Found: " + codes.length + " and has: " + lastLength)
    }
  })
}
