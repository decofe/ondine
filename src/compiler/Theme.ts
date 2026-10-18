/** @module Semantic grayscale palettes inspired by Geist component and text roles. */

import type { MermaidConfig } from 'mermaid'

/** Compiler theme selection. Fonts are system fonts unless supplied by the host. */
export type Scheme = 'dark' | 'light'

/** Build a grayscale Mermaid configuration without loading fonts or remote assets. */
export function create(options: create.Options = {}): MermaidConfig {
  const dark = options.scheme === 'dark'
  const background = dark ? '#0a0a0a' : '#ffffff'
  const border = dark ? '#3d3d3d' : '#d4d4d4'
  const fill = dark ? '#1a1a1a' : '#f2f2f2'
  const line = dark ? '#a0a0a0' : '#8f8f8f'
  const text = dark ? '#ededed' : '#171717'
  const shades = dark
    ? ['#1a1a1a', '#292929', '#3d3d3d', '#515151', '#6e6e6e', '#8f8f8f', '#a0a0a0', '#b4b4b4', '#c7c7c7', '#dedede', '#ededed', '#fafafa']
    : ['#f2f2f2', '#e8e8e8', '#dedede', '#d4d4d4', '#c7c7c7', '#b4b4b4', '#a0a0a0', '#8f8f8f', '#767676', '#666666', '#515151', '#3d3d3d']

  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    look: 'classic',
    themeCSS: '.node rect{rx:6px;ry:6px}.node,.actor,.note{filter:none!important}',
    fontFamily: 'Geist, Inter, ui-sans-serif, system-ui, sans-serif',
    flowchart: { curve: 'basis', htmlLabels: true, padding: 18, nodeSpacing: 36, rankSpacing: 56 },
    themeVariables: {
      darkMode: dark,
      useGradient: false,
      background,
      fontSize: '14px',
      primaryColor: fill,
      primaryTextColor: text,
      primaryBorderColor: border,
      secondaryColor: dark ? '#292929' : '#fafafa',
      secondaryTextColor: text,
      secondaryBorderColor: border,
      tertiaryColor: background,
      tertiaryTextColor: text,
      tertiaryBorderColor: border,
      lineColor: line,
      textColor: text,
      mainBkg: fill,
      nodeBorder: border,
      clusterBkg: dark ? '#111111' : '#fafafa',
      clusterBorder: border,
      edgeLabelBackground: background,
      titleColor: text,
      actorBkg: fill,
      actorBorder: border,
      actorTextColor: text,
      actorLineColor: line,
      signalColor: line,
      signalTextColor: text,
      labelBoxBkgColor: fill,
      labelBoxBorderColor: border,
      labelTextColor: text,
      loopTextColor: text,
      noteBkgColor: fill,
      noteTextColor: text,
      noteBorderColor: border,
      activationBkgColor: fill,
      activationBorderColor: border,
      sequenceNumberColor: text,
      sectionBkgColor: fill,
      altSectionBkgColor: background,
      sectionBkgColor2: dark ? '#292929' : '#e8e8e8',
      taskBkgColor: fill,
      taskTextColor: text,
      taskBorderColor: border,
      activeTaskBkgColor: dark ? '#3d3d3d' : '#d4d4d4',
      doneTaskBkgColor: dark ? '#292929' : '#e8e8e8',
      critBkgColor: dark ? '#515151' : '#b4b4b4',
      gridColor: border,
      todayLineColor: line,
      pieTitleTextColor: text,
      pieSectionTextColor: text,
      pieLegendTextColor: text,
      pieStrokeColor: border,
      quadrantPointFill: line,
      quadrantPointTextFill: text,
      quadrantPointStrokeFill: border,
      quadrant1Fill: fill,
      quadrant2Fill: dark ? '#222222' : '#e8e8e8',
      quadrant3Fill: dark ? '#292929' : '#dedede',
      quadrant4Fill: dark ? '#333333' : '#d4d4d4',
      quadrant1TextFill: text,
      quadrant2TextFill: text,
      quadrant3TextFill: text,
      quadrant4TextFill: text,
      ...Object.fromEntries(shades.map((color, index) => [`pie${index + 1}`, color])),
      ...Object.fromEntries(shades.map((color, index) => [`cScale${index}`, color])),
      ...Object.fromEntries(shades.map((_color, index) => [`cScaleLabel${index}`, text])),
    },
  }
}

export declare namespace create {
  /** Optional output appearance. */
  type Options = {
    /** Light by default. Compile both schemes to serve theme-specific assets. */
    readonly scheme?: Scheme | undefined
  }
}
