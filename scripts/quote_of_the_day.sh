#!/bin/bash

quotes=(
  "There are no original ideas. There are only original people. - Barbara Grizzuti"
  "The person who gets 1 shot needs everything to go right, the person who gets 1000 shots is going to score at some point. Find a way to play the game that ensures you get a lot of shots. - James Clear"
  "Success isn't overnight. It's when everyday you get a little better than the day before. It all adds up. - Dwayne Johnson"
  "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times. - Bruce Lee"
  "We're externally reliant on conditions being perfect in order to be able to go out and have a good time. - Josh Waitzkin"
  "Optimism is the faith that leads to achievement, nothing can be done without hope. - Helen Keller"
  "No one is as impressed with your possessions as you are. - Kevin Kelly"
  "Don't ever work for someone you don't want to become. - Kevin Kelly"
  "Cultivate 12 people who love you, because they are worth more than 12 million people who like you. - Kevin Kelly"
  "Don't keep making the same mistakes; try to make new mistakes. - Kevin Kelly"
  "If you stop to listen to a musician or street performer for more than a minute, you owe them a dollar. - Kevin Kelly"
  "Anything you say before the word 'but' does not count. - Kevin Kelly"
  "Forgiveness primarily benefits your own healing, acting as a personal gift. - Kevin Kelly"
  "Practice simple, free courtesies in daily life, like tidiness and respect in shared spaces, and return borrowed items in better condition. - Kevin Kelly"
  "Whenever there is an argument between two sides, find the third side. - Kevin Kelly"
  "Rest and leisure are crucial for peak performance and a strong work ethic; don't overvalue constant efficiency at the expense of necessary breaks. - Kevin Kelly"
  "When you lead, your real job is to create more leaders, not more followers. - Kevin Kelly"
  "Criticize in private, praise in public. - Kevin Kelly"
  "Life presents lessons sequentially as needed, and you possess the inherent ability to master them; being alive implies continuous learning. - Kevin Kelly"
  "It is the duty of a student to get everything out of a teacher, and the duty of a teacher to get everything out of a student. - Kevin Kelly"
  "If winning becomes too important in a game, change the rules to make it more fun. Changing rules can become the new game. - Kevin Kelly"
  "Ask funders for money, and they'll give you advice; but ask for advice and they'll give you money. - Kevin Kelly"
  "Focus on finding engaging and meaningful tasks rather than just optimizing for speed in completing all tasks; true productivity can be a distraction from fulfilling work. - Kevin Kelly"
  "Promptly pay vendors, workers, and contractors to build goodwill and ensure they prioritize working with you in the future. - Kevin Kelly"
  "The biggest lie we tell ourselves is 'I don't need to write this down because I will remember it.' - Kevin Kelly"
  "Your growth as a conscious being is measured by the number of uncomfortable conversations you are willing to have. - Kevin Kelly"
  "Speak confidently as if you are right, but listen carefully as if you are wrong. - Kevin Kelly"
  "Handy measure: the distance between your fingertips of your outstretched arms at shoulder level is your height. - Kevin Kelly"
  "Consistent daily effort in areas like exercise, relationships, and work yields better results than infrequent, large efforts. - Kevin Kelly"
  "Making art is not selfish; it's for the rest of us. If you don't do your thing, you are cheating us. - Kevin Kelly"
  "Never ask a woman if she is pregnant. Let her tell you if she is. - Kevin Kelly"
  "Essential needs include persistence for viable projects, decisiveness to abandon failing ones, and trusting others to help differentiate. - Kevin Kelly"
  "Use pauses effectively in public speaking—before new points, after important statements, and to allow audience absorption—to enhance communication. - Kevin Kelly"
  "There is no such thing as being 'on time.' You are either late or you are early. Your choice. - Kevin Kelly"
  "Admired individuals often find lucky breaks through unexpected detours from their primary goals, so embrace life's non-linear path. - Kevin Kelly"
  "The best way to get a correct answer on the internet is to post an obviously wrong answer and wait for someone to correct you. - Kevin Kelly"
  "Reinforcing good behavior is far more effective than punishing bad behavior, particularly with children and animals. - Kevin Kelly"
  "Invest significant effort in email subject lines, as they are frequently the only part recipients read and determine if the email is opened. - Kevin Kelly"
  "Don't wait for the storm to pass; dance in the rain. - Kevin Kelly"
  "To get honest feedback when checking job references, ask referees to respond only if they *highly* recommend the candidate; a non-response can indicate a negative assessment. - Kevin Kelly"
  "Use a password manager: Safer, easier, better. - Kevin Kelly"
  "Half the skill of being educated is learning what you can ignore. - Kevin Kelly"
  "Setting extremely ambitious goals means that even falling short can result in achievements considered successful by normal standards. - Kevin Kelly"
  "A great way to understand yourself is to seriously reflect on everything you find irritating in others. - Kevin Kelly"
  "To avoid leaving items in a hotel, keep everything visible and grouped together. For outliers like chargers, place them with other large items to make them harder to forget. - Kevin Kelly"
  "Denying or deflecting a compliment is rude. Accept it with thanks, even if you believe it is not deserved. - Kevin Kelly"
  "Always read the plaque next to the monument. - Kevin Kelly"
  "Imposter syndrome is common with success, but creating things that stem from your unique abilities confirms your authenticity; focus on these unique contributions. - Kevin Kelly"
  "What you do on your bad days matters more than what you do on your good days. - Kevin Kelly"
  "Make stuff that is good for people to have. - Kevin Kelly"
  "When you open paint, even a tiny bit, it will always find its way to your clothes no matter how careful you are. Dress accordingly. - Kevin Kelly"
  "Manage children's behavior on road trips by discarding a piece of their favorite candy out the window for each misbehavior. - Kevin Kelly"
  "You cannot get smart people to work extremely hard just for money. - Kevin Kelly"
  "When you don't know how much to pay someone for a particular task, ask them 'what would be fair' and their answer usually is. - Kevin Kelly"
  "Since most things in any category might not appeal to you (are 'crap'), persist in exploring to discover the 10% that you find valuable or enjoyable. - Kevin Kelly"
  "You will be judged on how well you treat those who can do nothing for you. - Kevin Kelly"
  "Humans overestimate daily achievements but underestimate long-term (decade-long) potential; sustained small efforts over time lead to significant accomplishments. - Kevin Kelly"
  "Thank a teacher who changed your life. - Kevin Kelly"
  "You can't reason someone out of a notion that they didn't reason themselves into. - Kevin Kelly"
  "Your best job will be one that you were unqualified for because it stretches you. In fact only apply to jobs you are unqualified for. - Kevin Kelly"
  "Buy used books. They have the same words as the new ones. Also libraries. - Kevin Kelly"
  "You can be whatever you want, so be the person who ends meetings early. - Kevin Kelly"
  "Before speaking, filter your words by asking if they are true, necessary, and kind. - Kevin Kelly"
  "Take the stairs. - Kevin Kelly"
  "The true cost of an item is often double its listed price when considering the resources (time, energy, money) for its entire lifecycle, from setup to disposal. - Kevin Kelly"
  "When you arrive at your room in a hotel, locate the emergency exits. It only takes a minute. - Kevin Kelly"
  "The only productive way to answer 'what should I do now?' is to first tackle the question of 'who should I become?' - Kevin Kelly"
  "Average returns sustained over an above-average period of time yield extraordinary results. Buy and hold. - Kevin Kelly"
  "It's thrilling to be extremely polite to rude strangers. - Kevin Kelly"
  "Strong communication skills can lead to greater success than high intelligence alone, which is encouraging as communication is more readily improvable than intelligence. - Kevin Kelly"
  "Occasional deception is a minor consequence of generally trusting people, as trusting in others' best qualities often elicits their best behavior towards you. - Kevin Kelly"
  "Art is whatever you can get away with. - Kevin Kelly"
  "For the best results with your children, spend only half the money you think you should, but double the time with them. - Kevin Kelly"
  "Purchase the most recent tourist guidebook to your home town or region. You'll learn a lot by playing the tourist once a year. - Kevin Kelly"
  "Don't wait in line to eat something famous. It is rarely worth the wait. - Kevin Kelly"
  "To rapidly reveal the true character of a person you just met, move them onto an abysmally slow internet connection. Observe. - Kevin Kelly"
  "Prescription for popular success: do something strange. Make a habit of your weird. - Kevin Kelly"
  "Act professionally by implementing redundant backup strategies for your data (multiple physical and cloud backups), as this is far cheaper than the regret of data loss. - Kevin Kelly"
  "Don't believe everything you think you believe. - Kevin Kelly"
  "To signal an emergency, use the rule of three; 3 shouts, 3 horn blasts, or 3 whistles. - Kevin Kelly"
  "Strive for a balance between trying new things and deepening existing good things, dedicating about one-third of your time to exploration, even as it becomes harder with age. - Kevin Kelly"
  "Actual great opportunities do not have 'Great Opportunities' in the subject line. - Kevin Kelly"
  "When introduced to someone make eye contact and count to 4. You'll both remember each other. - Kevin Kelly"
  "Take note if you find yourself wondering 'Where is my good knife? Or, where is my good pen?' That means you have bad ones. Get rid of those. - Kevin Kelly"
  "If you're stuck, articulate your problem to others; the act of explaining can often reveal the solution, making it a key troubleshooting step. - Kevin Kelly"
  "When purchasing items like hoses, extension cords, or ladders, buy a much longer version than you initially estimate you'll need; it will likely be the correct, more useful size. - Kevin Kelly"
  "Don't bother fighting the old; just build the new. - Kevin Kelly"
  "Your group can achieve great things way beyond your means simply by showing people that they are appreciated. - Kevin Kelly"
  "People often perceive the 'peak of human history' as the time when they were around ten years old, reflecting a personal, rather than objective, peak experience. - Kevin Kelly"
  "You are as big as the things that make you angry. - Kevin Kelly"
  "During public speaking, connect with individuals by fixing your gaze on a few people rather than scanning the room, as your eyes convey conviction. - Kevin Kelly"
  "Rely on habits for consistent progress rather than fleeting inspiration; for instance, aim to become someone who consistently works out, not just to 'get in shape.' - Kevin Kelly"
  "When negotiating, don't aim for a bigger piece of the pie; aim to create a bigger pie. - Kevin Kelly"
  "If you repeated what you did today 365 more times will you be where you want to be next year? - Kevin Kelly"
  "You see only 2% of another person, and they see only 2% of you. Attune yourselves to the hidden 98%. - Kevin Kelly"
  "Since time and space are finite, declutter your life by removing items that no longer bring joy to create space for things that do. - Kevin Kelly"
  "Future generations will achieve amazing feats, some of which are possible even now with current resources if we expanded our imagination; therefore, think on a grander scale. - Kevin Kelly"
  "For a great payoff be especially curious about the things you are not interested in. - Kevin Kelly"
  "Prioritize maintaining the correct general path or direction in life over fixating on specific, unknowable destinations to eventually reach your desired outcomes. - Kevin Kelly"
  "True breakthroughs often initially appear comical or absurd; if an idea doesn't seem this way at first, it might not be a genuine breakthrough. - Kevin Kelly"
  "Copying others is a good way to start. Copying yourself is a disappointing way to end. - Kevin Kelly"
  "Negotiate salary for a new job only after receiving an offer. Try to get the employer to state their figure first, as this gives you an advantage. - Kevin Kelly"
  "Rather than steering your life to avoid surprises, aim directly for them. - Kevin Kelly"
  "Don't purchase extra insurance if you are renting a car with a credit card. - Kevin Kelly"
  "Predictable opinions across different subjects may indicate ideological thinking; genuine independent thought leads to less foreseeable conclusions. - Kevin Kelly"
  "Plan to distribute your wealth to beneficiaries while you're alive for greater enjoyment and utility, aiming to have spent all your resources by the end of your life. - Kevin Kelly"
  "The chief prevention against getting old is to remain astonished. - Kevin Kelly"
  "The only way to do great work is to love what you do. - Steve Jobs"
  "Strive not to be a success, but rather to be of value. - Albert Einstein"
  "The mind is everything. What you think you become. - Buddha"
  "Your time is limited, so don't waste it living someone else's life. - Steve Jobs"
  "The secret of getting ahead is getting started. - Mark Twain"
  "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel. - Maya Angelou"
  "Whether you think you can or you think you can't, you're right. - Henry Ford"
  "The best revenge is massive success. - Frank Sinatra"
  "It does not matter how slowly you go as long as you do not stop. - Confucius"
  "Everything you can imagine is real. - Pablo Picasso"
  "Be yourself; everyone else is already taken. - Oscar Wilde"
  "To live is the rarest thing in the world. Most people exist, that is all. - Oscar Wilde"
  "If you're going through hell, keep going. - Winston Churchill"
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill"
  "You have power over your mind, not outside events. Realize this, and you will find strength. - Marcus Aurelius"
  "Luck is what happens when preparation meets opportunity. - Seneca"
  "The unexamined life is not worth living. - Socrates"
  "Turn your wounds into wisdom. - Oprah Winfrey"
  "Whatever you are, be a good one. - Abraham Lincoln"
  "No one can make you feel inferior without your consent. - Eleanor Roosevelt"
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
  "Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world, stimulating progress, giving birth to evolution. - Albert Einstein"
  "Try to be a rainbow in someone's cloud. - Maya Angelou"
  "Our greatest glory is not in never failing, but in rising up every time we fail. - Ralph Waldo Emerson"
  "The journey of a thousand miles begins with a single step. - Lao Tzu"
  "Be the change that you wish to see in the world. - Mahatma Gandhi"
  "The time is always right to do what is right. - Martin Luther King Jr."
  "Darkness cannot drive out darkness: only light can do that. Hate cannot drive out hate: only love can do that. - Martin Luther King Jr."
  "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela"
  "It always seems impossible until it's done. - Nelson Mandela"
  "Judge a man by his questions rather than by his answers. - Voltaire"
  "If liberty means anything at all, it means the right to tell people what they do not want to hear. - George Orwell"
  "All the world's a stage, and all the men and women merely players. - William Shakespeare"
  "The fool doth think he is wise, but the wise man knows himself to be a fool. - William Shakespeare"
  "Everyone thinks of changing the world, but no one thinks of changing himself. - Leo Tolstoy"
  "The two most powerful warriors are patience and time. - Leo Tolstoy"
  "That which does not kill us makes us stronger. - Friedrich Nietzsche"
  "He who has a why to live can bear almost any how. - Friedrich Nietzsche"
  "Somewhere, something incredible is waiting to be known. - Carl Sagan"
  "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less. - Marie Curie"
  "Be less curious about people and more curious about ideas. - Marie Curie"
  "The wound is the place where the Light enters you. - Rumi"
  "We cannot choose our external circumstances, but we can always choose how we respond to them. - Epictetus"
  "There is no charm equal to tenderness of heart. - Jane Austen"
  "The best way to predict the future is to create it. - Peter Drucker"
  "Management is doing things right; leadership is doing the right things. - Peter Drucker"
  "An eye for an eye only ends up making the whole world blind. - Mahatma Gandhi"
  "In a time of universal deceit - telling the truth is a revolutionary act. - George Orwell"
  "What lies behind us and what lies before us are tiny matters compared to what lies within us. - Ralph Waldo Emerson"
  "Life is what happens when you're busy making other plans. - John Lennon"
  "Not all those who wander are lost. - J.R.R. Tolkien"
  "Go confidently in the direction of your dreams! Live the life you've imagined. - Henry David Thoreau"
  "The only impossible journey is the one you never begin. - Tony Robbins"
  "Do not go where the path may lead, go instead where there is no path and leave a trail. - Ralph Waldo Emerson"
  "Simplicity is the ultimate sophistication. - Leonardo da Vinci"
  "Learning never exhausts the mind. - Leonardo da Vinci"
  "What would life be if we had no courage to attempt anything? - Vincent van Gogh"
  "A day without laughter is a day wasted. - Charlie Chaplin"
  "We are what we repeatedly do. Excellence, then, is not an act, but a habit. - Aristotle"
  "Knowing yourself is the beginning of all wisdom. - Aristotle"
  "The beginning is the most important part of the work. - Plato"
  "Wise men speak because they have something to say; Fools because they have to say something. - Plato"
  "A room without books is like a body without a soul. - Cicero"
  "In three words I can sum up everything I've learned about life: it goes on. - Robert Frost"
  "Keep your face always toward the sunshine, and shadows will fall behind you. - Walt Whitman"
  "In the midst of winter, I found there was, within me, an invincible summer. - Albert Camus"
  "Change your life today. Don't gamble on the future, act now, without delay. - Simone de Beauvoir"
  "Someone's sitting in the shade today because someone planted a tree a long time ago. - Warren Buffett"
  "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1. - Warren Buffett"
  "You can make more friends in two months by becoming interested in other people than you can in two years by trying to get other people interested in you. - Dale Carnegie"
  "It is not the strongest of the species that survives, nor the most intelligent that survives. It is the one that is most adaptable to change. - Charles Darwin"
  "Our prime purpose in this life is to help others. And if you can't help them, at least don't hurt them. - Dalai Lama"
  "Spread love everywhere you go. Let no one ever come to you without leaving happier. - Mother Teresa"
  "Not all of us can do great things. But we can do small things with great love. - Mother Teresa"
  "Seek first to understand, then to be understood. - Stephen Covey"
  "The key is not to prioritize what's on your schedule, but to schedule your priorities. - Stephen Covey"
  "The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart. - Helen Keller"
  "Life isn't about finding yourself. Life is about creating yourself. - George Bernard Shaw"
  "Progress is impossible without change, and those who cannot change their minds cannot change anything. - George Bernard Shaw"
  "I find that the harder I work, the more luck I seem to have. - Thomas Jefferson"
  "Tell me and I forget. Teach me and I remember. Involve me and I learn. - Benjamin Franklin"
  "An investment in knowledge pays the best interest. - Benjamin Franklin"
  "Feet, what do I need you for when I have wings to fly? - Frida Kahlo"
  "Two roads diverged in a wood, and I—I took the one less traveled by, And that has made all the difference. - Robert Frost"
  "Happiness is not something ready made. It comes from your own actions. - Dalai Lama XIV"
  "The only true wisdom is in knowing you know nothing. - Socrates"
  "If you want to lift yourself up, lift up someone else. - Booker T. Washington"
  "I have not failed. I've just found 10,000 ways that won't work. - Thomas A. Edison"
  "A man is but what he knows. - Francis Bacon"
  "If I have seen further it is by standing on the sholders of Giants. - Isaac Newton"
  "What does it mean to be motivated? For me it means choosing to push myself to be better in all things. In our work, in creativity, in life overall."
  "It's so easy to think that we were in the dark yesterday but we're in the light today, but we're in the fucking dark today too. - Josh Waitzkin"
)

num_quotes=${#quotes[@]}

random_index=$((RANDOM % num_quotes))
selected_quote=${quotes[$random_index]}

if command -v jarvis &> /dev/null; then
  echo "$selected_quote" | jarvis --stdin --layout main
else
  echo "Warning: 'jarvis' command not found. Cannot display on topbar."
fi

echo "Topbar message: $message_to_display"
