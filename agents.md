# Agents.md

## Stack

* All written in NodeJs v24
* Use native modules as much as possible.
* Use `module` instead of `commmonjs`


## Structure

* The overarching logic is broken down in distinct scripts that each represent one part of the pipeline.
* Each step is prefixed with the number, so to indicate the precedence of each step in the pipeline.
* Any intermediary files and content created should go in the `temp/` folder of the project root.

## Pipeline