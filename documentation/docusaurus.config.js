// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Ridge AI',
  tagline: 'Merge AI with your brain.',

  staticDirectories: ['assets'],

  favicon: 'img/favicon-128x128.ico',

  // Set the production url of your site here
  url: 'https://docs.ridge.dev',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'ridge-ai', // Usually your GitHub org/user name.
  projectName: 'ridge', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/ridge-ai/ridge/tree/master/documentation/',
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/ridge-ai/ridge/tree/master/documentation/blog/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/ridge-logo-sideways-500.png',
      announcementBar: {
        backgroundColor: '#fcc50b',
        content: "Give us a star on <a target='_blank' rel='noopener noreferrer' href='https://github.com/ridge-ai/ridge'>GitHub</a>!"
      },
      metadata: [
        {name: 'keywords', content: 'ridge, ridge ai, chatgpt, open ai, open source, productivity'},
        {name: 'og:title', content: 'Ridge Documentation'},
        {name: 'og:type', content: 'website'},
        {name: 'og:site_name', content: 'Ridge Documentation'},
        {name: 'og:description', content: 'Quickly get started with using or self-hosting Ridge'},
        {name: 'og:image', content: 'https://ridge-web-bucket.s3.amazonaws.com/link_preview_docs.png'},
        {name: 'og:url', content: 'https://docs.ridge.dev'},
        {name: 'keywords', content: 'ridge, ridge ai, chatgpt, open ai, open source, productivity'}
      ],
      navbar: {
        title: 'Ridge',
        logo: {
          alt: 'Ridge AI',
          src: 'img/favicon-128x128.ico',
        },
        items: [
          {
            type: 'docSidebar',
            position: 'left',
            label: 'Docs',
            sidebarId: 'tutorialSidebar',
          },
          // {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/ridge-ai/ridge',
            label: 'Ridge',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Get Started',
                to: '/',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/BDgyabRM6e',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/sabaimran_go',
              },
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/company/ridge-ai/'
              }
            ],
          },
          {
            title: 'More',
            items: [
              // {
              //   label: 'Blog',
              //   to: '/blog',
              // },
              {
                label: 'GitHub',
                href: 'https://github.com/ridge-ai/ridge',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Ridge, Inc.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
