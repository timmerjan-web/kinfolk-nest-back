<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the family app's color system in `src/styles.css` semantic tokens and use those tokens for all navigation states, so active items stay legible across themes.
- Load Syne and Plus Jakarta Sans via the root route head, because remote CSS imports break Tailwind's build.
