import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ✅ 우리가 원하는 고정 뷰포트 */}
        <meta name="viewport" content="width=1024" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
