# Image Generation
You can use Ridge to generate images from text prompts. You can get deeper into the  details of our image generation flow in this blog post: https://blog.ridge.dev/posts/how-ridge-generates-images/.

To generate images, you just need to provide a prompt to Ridge in which the image generation is in the instructions. Ridge will automatically detect the image generation intent, augment your generation prompt, and then create the image. Here are some examples:
| Prompt | Image |
| --- | --- |
| Paint a picture of the plants I got last month, pixar-animation | ![plants](/img/plants_i_got.png) |
| Create a picture of my dream house, based on my interests | ![house](/img/dream_house.png) |


## Setup (Self-Hosting)

Right now, we only support integration with OpenAI's DALL-E. You need to have an OpenAI API key to use this feature. Here's how you can set it up:
1. Setup your OpenAI API key. See instructions [here](/get-started/setup#2-configure)
2. Create a text to image config at http://localhost:42110/server/admin/database/texttoimagemodelconfig/. We recommend the value `dall-e-3`.
